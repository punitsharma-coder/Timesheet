sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/Dialog",
    "sap/m/Input",
    "sap/m/Label",
    "sap/m/Button",
    "sap/m/VBox",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], (Controller, JSONModel, Dialog, Input, Label, Button, VBox, MessageToast, MessageBox) => {
    "use strict";

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Returns the Monday of the week containing the given date */
    function getWeekStart(date) {
        const d   = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /** Formats a Date as "YYYY-MM-DD" (OData Date literal) */
    function toDateString(date) {
        return date.toISOString().split("T")[0];
    }

    /** Formats a Date as "2 Oct" for display */
    function toShortLabel(date) {
        const months = ["Jan","Feb","Mar","Apr","May","Jun",
                        "Jul","Aug","Sep","Oct","Nov","Dec"];
        return `${date.getDate()} ${months[date.getMonth()]}`;
    }

    /** Builds the 7-day label array for the column headers */
    function buildDayLabels(weekStart) {
        const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
        return days.map((name, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            return { name, label: `${name}\n${toShortLabel(d)}` };
        });
    }

    // ── Controller ───────────────────────────────────────────────────────────

    return Controller.extend("timesheet.app.controller.Dashboard", {

        onInit() {
            this._oViewModel = new JSONModel({
                weekStart:       null,
                weekStartFilter: "",
                weekRangeLabel:  "",
                grandTotal:      "0:00",
                days:            []
            });
            this.getView().setModel(this._oViewModel, "view");

            this._setWeek(new Date());

            // Refresh totals whenever the table binding updates
            const oTable = this.byId("timesheetTable");
            oTable.getBinding("rows")?.attachChange(this._refreshGrandTotal.bind(this));
        },

        // ── Week Navigation ───────────────────────────────────────────────────

        onPrevWeek() {
            const d = new Date(this._oViewModel.getProperty("/weekStart"));
            d.setDate(d.getDate() - 7);
            this._setWeek(d);
        },

        onNextWeek() {
            const d = new Date(this._oViewModel.getProperty("/weekStart"));
            d.setDate(d.getDate() + 7);
            this._setWeek(d);
        },

        onToday() {
            this._setWeek(new Date());
        },

        /** Updates view model and rebinds the table for the given week */
        _setWeek(date) {
            const start = getWeekStart(date);
            const end   = new Date(start);
            end.setDate(start.getDate() + 6);

            this._oViewModel.setProperty("/weekStart",       start);
            this._oViewModel.setProperty("/weekStartFilter", toDateString(start));
            this._oViewModel.setProperty("/weekRangeLabel",
                `${toShortLabel(start)} – ${toShortLabel(end)}`);
            this._oViewModel.setProperty("/days", buildDayLabels(start));

            this._rebindTable();
        },

        _rebindTable() {
            const sFilter = this._oViewModel.getProperty("/weekStartFilter");
            const oTable  = this.byId("timesheetTable");
            oTable.bindRows({
                path:       "/TimeEntries",
                parameters: {
                    expand:  "project",
                    $filter: `weekStart eq ${sFilter}`
                }
            });
        },

        // ── Add Row Dialog ────────────────────────────────────────────────────

        onAddRow() {
            if (!this._oAddDialog) {
                this._oAddDialog = this._buildAddDialog();
                this.getView().addDependent(this._oAddDialog);
            }
            this._oAddDialog.open();
        },

        _buildAddDialog() {
            const oProjectInput = new Input({ placeholder: "e.g. Project Alpha", width: "100%" });
            const oTaskInput    = new Input({ placeholder: "e.g. UI Development",  width: "100%" });

            return new Dialog({
                title: "Add Timesheet Row",
                content: new VBox({
                    width: "300px",
                    items: [
                        new Label({ text: "Project Name", labelFor: oProjectInput }),
                        oProjectInput,
                        new Label({ text: "Task",         labelFor: oTaskInput,    class: "sapUiTinyMarginTop" }),
                        oTaskInput
                    ]
                }),
                beginButton: new Button({
                    text: "Add",
                    type: "Emphasized",
                    press: () => this._submitAddRow(oProjectInput, oTaskInput)
                }),
                endButton: new Button({
                    text:  "Cancel",
                    press: () => this._oAddDialog.close()
                })
            });
        },

        async _submitAddRow(oProjectInput, oTaskInput) {
            const sProject = oProjectInput.getValue().trim();
            const sTask    = oTaskInput.getValue().trim();

            if (!sProject || !sTask) {
                MessageToast.show("Please fill in both fields.");
                return;
            }

            try {
                const oModel     = this.getView().getModel();
                const sWeekStart = this._oViewModel.getProperty("/weekStartFilter");

                await oModel.bindContext("/addRow(...)").execute({
                    projectName: sProject,
                    taskName:    sTask,
                    weekStart:   sWeekStart
                });

                oModel.refresh();
                this._oAddDialog.close();
                oProjectInput.setValue("");
                oTaskInput.setValue("");
                MessageToast.show("Row added.");
            } catch (err) {
                MessageBox.error("Failed to add row: " + err.message);
            }
        },

        // ── Cell Change ───────────────────────────────────────────────────────

        onHoursChange(oEvent) {
            const oInput   = oEvent.getSource();
            const oContext = oInput.getBindingContext();
            if (!oContext) return;

            // UI5 OData v4 two-way binding handles the PATCH automatically.
            // We only need to refresh the grand total display.
            this._refreshGrandTotal();
        },

        // ── Row Total Formatter ───────────────────────────────────────────────

        /** Called by the binding expression in XML with 7 day values */
        formatRowTotal(...args) {
            const total = args.reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
            return this._toHHMM(total);
        },

        // ── Grand Total ───────────────────────────────────────────────────────

        _refreshGrandTotal() {
            const oTable   = this.byId("timesheetTable");
            const oBinding = oTable.getBinding("rows");
            if (!oBinding) return;

            const contexts = oBinding.getContexts();
            const days     = ["mon","tue","wed","thu","fri","sat","sun"];

            const total = contexts.reduce((sum, ctx) => {
                return sum + days.reduce((rowSum, day) => {
                    return rowSum + (parseFloat(ctx.getProperty(day)) || 0);
                }, 0);
            }, 0);

            this._oViewModel.setProperty("/grandTotal", this._toHHMM(total));
        },

        /** Converts decimal hours (8.5) → "8:30" display format */
        _toHHMM(decimalHours) {
            const h = Math.floor(decimalHours);
            const m = Math.round((decimalHours - h) * 60);
            return `${h}:${String(m).padStart(2, "0")}`;
        },

        // ── View Toggle ───────────────────────────────────────────────────────

        onViewToggle(oEvent) {
            const sKey = oEvent.getParameter("item").getKey();
            if (sKey === "day") {
                MessageToast.show("Day view – coming soon.");
            }
        }
    });
});
