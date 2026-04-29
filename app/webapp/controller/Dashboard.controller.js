sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Popover",
    "sap/ui/unified/Calendar"
], (Controller, JSONModel, MessageToast, MessageBox, Popover, Calendar) => {
    "use strict";

    const DAYS      = ["mon","tue","wed","thu","fri","sat","sun"];
    const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const MONTHS    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const EMPTY_ROW = () => ({
        projectName: "", taskName: "",
        mon:"", tue:"", wed:"", thu:"", fri:"", sat:"", sun:"",
        locked:     { mon:false, tue:false, wed:false, thu:false, fri:false, sat:false, sun:false },
        _rowLocked: false
    });

    function getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function toDateString(date) { return date.toISOString().split("T")[0]; }

    function toShortLabel(date) {
        return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
    }

    function buildDayLabels(weekStart) {
        return DAY_NAMES.map((name, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            return { name, date: toShortLabel(d) };
        });
    }

    // Returns Monday of (current week - 1)
    function getAllowedMinWeek() {
        const prev = getWeekStart(new Date());
        prev.setDate(prev.getDate() - 7);
        return prev;
    }

    // Returns Monday of current week
    function getAllowedMaxWeek() {
        return getWeekStart(new Date());
    }

    return Controller.extend("timesheet.app.controller.Dashboard", {

        onInit() {
            this._oViewModel = new JSONModel({
                weekStart:       null,
                weekStartFilter: "",
                weekRangeLabel:  "",
                grandTotal:      "0:00",
                rowCount:        1,
                canGoPrev:       false,
                canGoNext:       false,
                days:            [],
                colTotals: { mon:"0:00", tue:"0:00", wed:"0:00", thu:"0:00",
                             fri:"0:00", sat:"0:00", sun:"0:00", total:"0:00" }
            });
            this.getView().setModel(this._oViewModel, "view");

            this._oRowsModel = new JSONModel({ rows: [EMPTY_ROW()] });
            this.getView().setModel(this._oRowsModel, "rows");

            this._setWeek(new Date());
        },

        // ── Week Navigation ──────────────────────────────────────────────────

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

        onToday() { this._setWeek(new Date()); },

        _setWeek(date) {
            const minWeek = getAllowedMinWeek();
            const maxWeek = getAllowedMaxWeek();
            let   start   = getWeekStart(date);

            // Clamp to allowed range: prev week ↔ current week only
            if (start.getTime() < minWeek.getTime()) start = new Date(minWeek);
            if (start.getTime() > maxWeek.getTime()) start = new Date(maxWeek);

            const end = new Date(start);
            end.setDate(start.getDate() + 6);

            this._oViewModel.setProperty("/weekStart",       start);
            this._oViewModel.setProperty("/weekStartFilter", toDateString(start));
            this._oViewModel.setProperty("/weekRangeLabel",  `${toShortLabel(start)} - ${toShortLabel(end)}`);
            this._oViewModel.setProperty("/days",            buildDayLabels(start));
            this._oViewModel.setProperty("/canGoPrev",       start.getTime() > minWeek.getTime());
            this._oViewModel.setProperty("/canGoNext",       start.getTime() < maxWeek.getTime());

            this._loadTimesheetData();
        },

        // ── Calendar Popover ─────────────────────────────────────────────────

        onCalendarPress(oEvent) {
            if (!this._oCalPopover) {
                const minWeek    = getAllowedMinWeek();
                const maxWeekEnd = new Date(getAllowedMaxWeek());
                maxWeekEnd.setDate(maxWeekEnd.getDate() + 6);

                this._oDashCal = new Calendar({
                    minDate: minWeek,
                    maxDate: maxWeekEnd,
                    select:  this.onCalendarWeekSelect.bind(this)
                });
                this._oCalPopover = new Popover({
                    showHeader: false,
                    placement:  "Bottom",
                    content:    [this._oDashCal]
                });
                this.getView().addDependent(this._oCalPopover);
            }
            this._oCalPopover.openBy(oEvent.getSource());
        },

        onCalendarWeekSelect(oEvent) {
            const oCal   = oEvent.getSource();
            const aDates = oCal.getSelectedDates();
            if (!aDates || !aDates.length) return;
            const oStart = aDates[0].getStartDate();
            if (!oStart) return;
            this._oCalPopover.close();
            this._setWeek(new Date(oStart));
        },

        // ── Data Loading ─────────────────────────────────────────────────────

        _loadTimesheetData() {
            const sWeekStart = this._oViewModel.getProperty("/weekStartFilter");

            const oLocksModel = this.getOwnerComponent().getModel("locked");
            const savedWeek   = oLocksModel.getProperty("/" + sWeekStart);

            if (savedWeek) {
                this._setRows(savedWeek);
                return;
            }

            const weekStart = this._oViewModel.getProperty("/weekStart");
            const weekDates = DAYS.map((_, i) => {
                const d = new Date(weekStart);
                d.setDate(weekStart.getDate() + i);
                return toDateString(d);
            });

            const oModel   = this.getOwnerComponent().getModel();
            const oBinding = oModel.bindList("/MyEntries", null, null, null, {
                $expand: "task",
                $filter: `timesheet/weekStartDate eq ${sWeekStart}`
            });

            oBinding.requestContexts(0, 200)
                .then(aCtx => {
                    const entries = aCtx.map(c => c.getObject());
                    this._setRows(entries.length > 0
                        ? this._pivotEntries(entries, weekDates)
                        : [EMPTY_ROW()]);
                })
                .catch(() => this._setRows([EMPTY_ROW()]));
        },

        _pivotEntries(entries, weekDates) {
            const rowMap = new Map();
            for (const entry of entries) {
                const taskId   = entry.task_taskId ?? "unknown";
                const taskName = entry.task?.taskName ?? "Unknown Task";
                const taskDesc = entry.task?.taskDescription ?? "";

                if (!rowMap.has(taskId)) {
                    rowMap.set(taskId, { projectName: taskName, taskName: taskDesc,
                        mon:0, tue:0, wed:0, thu:0, fri:0, sat:0, sun:0 });
                }
                const idx = weekDates.indexOf(entry.workDate);
                if (idx >= 0) rowMap.get(taskId)[DAYS[idx]] += parseFloat(entry.hoursWorked) || 0;
            }

            return Array.from(rowMap.values()).map(row => {
                const r = {
                    projectName: row.projectName, taskName: row.taskName,
                    locked:     { mon:false, tue:false, wed:false, thu:false, fri:false, sat:false, sun:false },
                    _rowLocked: false
                };
                DAYS.forEach(d => { r[d] = row[d] > 0 ? this._toHHMM(row[d]) : ""; });
                return r;
            });
        },

        // Apply future-date locks: days after today are not fillable
        _applyFutureLocks(rows) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const weekStart = this._oViewModel.getProperty("/weekStart");

            return rows.map(row => {
                const locked = { ...row.locked };
                DAYS.forEach((d, i) => {
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(weekStart.getDate() + i);
                    if (dayDate > today) locked[d] = true;
                });
                return { ...row, locked, _rowLocked: DAYS.every(d => locked[d]) };
            });
        },

        _setRows(rows) {
            const lockedRows = this._applyFutureLocks(rows);
            this._oRowsModel.setProperty("/rows", lockedRows);
            this._refreshTotals(lockedRows);
            this._updateRowCount();
        },

        // ── Add Row ──────────────────────────────────────────────────────────

        onAddRow() {
            const rows = this._oRowsModel.getProperty("/rows");
            rows.push(EMPTY_ROW());
            this._oRowsModel.setProperty("/rows", rows);
            this._applyFutureLocks(rows);
            this._updateRowCount();
        },

        // ── Submit ───────────────────────────────────────────────────────────

        onSubmit() {
            const rows   = this._oRowsModel.getProperty("/rows");
            const hasNew = rows.some(r => DAYS.some(d => r[d] && !r.locked[d]));

            if (!hasNew) {
                MessageToast.show("No new hours to submit.");
                return;
            }

            MessageBox.confirm(
                `Submit timesheet for ${this._oViewModel.getProperty("/weekRangeLabel")}?\n` +
                "Submitted days will be locked and cannot be edited.",
                {
                    actions:  [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    onClose: (sAction) => {
                        if (sAction === MessageBox.Action.OK) this._doSubmit(rows);
                    }
                }
            );
        },

        _doSubmit(rows) {
            const sWeekStart = this._oViewModel.getProperty("/weekStartFilter");

            const updatedRows = rows.map(row => {
                const locked = { ...row.locked };
                DAYS.forEach(d => { if (row[d] && row[d] !== "") locked[d] = true; });
                return { ...row, locked, _rowLocked: DAYS.some(d => locked[d]) };
            });

            const oLocksModel = this.getOwnerComponent().getModel("locked");
            const allLocks    = oLocksModel.getData();
            allLocks[sWeekStart] = updatedRows;
            oLocksModel.setData(allLocks);

            this._oRowsModel.setProperty("/rows", updatedRows);

            const oHistoryModel = this.getOwnerComponent().getModel("history");
            const submissions   = oHistoryModel.getProperty("/submissions");
            const existingIdx   = submissions.findIndex(s => s.weekStart === sWeekStart);
            const record = {
                weekRange:   this._oViewModel.getProperty("/weekRangeLabel"),
                weekStart:   sWeekStart,
                submittedOn: new Date().toLocaleString(),
                grandTotal:  this._oViewModel.getProperty("/grandTotal"),
                days:        this._oViewModel.getProperty("/days"),
                rows:        JSON.parse(JSON.stringify(updatedRows)),
                status:      existingIdx >= 0 ? submissions[existingIdx].status : "Pending"
            };

            if (existingIdx >= 0) {
                submissions[existingIdx] = record;
            } else {
                submissions.unshift(record);
            }
            oHistoryModel.setProperty("/submissions", submissions);

            this.getOwnerComponent().persistHistory();
            this.getOwnerComponent().persistLocked();

            MessageToast.show("Submitted! Filled days are now locked.");
        },

        // ── Cell Change ───────────────────────────────────────────────────────

        onHoursChange(oEvent) {
            const oInput   = oEvent.getSource();
            const sRaw     = oEvent.getParameter("value").trim();
            const sDayKey  = oInput.data("day");
            const oContext = oInput.getBindingContext("rows");
            if (!oContext) return;

            const decimal    = this._parseHHMM(sRaw);
            const sFormatted = decimal > 0 ? this._toHHMM(decimal) : "";

            this._oRowsModel.setProperty(oContext.getPath() + "/" + sDayKey, sFormatted);
            oInput.setValue(sFormatted);
            this._refreshTotals(this._oRowsModel.getProperty("/rows"));
        },

        // ── Totals ───────────────────────────────────────────────────────────

        _refreshTotals(rows) {
            const colDec = { mon:0, tue:0, wed:0, thu:0, fri:0, sat:0, sun:0 };
            rows.forEach(row => DAYS.forEach(d => { colDec[d] += this._parseHHMM(row[d]); }));

            const grand  = DAYS.reduce((s, d) => s + colDec[d], 0);
            const totals = {};
            DAYS.forEach(d => { totals[d] = this._toHHMM(colDec[d]); });
            totals.total = this._toHHMM(grand);

            this._oViewModel.setProperty("/colTotals",  totals);
            this._oViewModel.setProperty("/grandTotal", this._toHHMM(grand));
        },

        _updateRowCount() {
            const n = this._oRowsModel.getProperty("/rows").length;
            this._oViewModel.setProperty("/rowCount", Math.max(n, 1));
        },

        // ── Formatters ───────────────────────────────────────────────────────

        formatNotLocked(bLocked) {
            return bLocked !== true;
        },

        formatRowTotal(...args) {
            const total = args.reduce((s, v) => s + this._parseHHMM(v), 0);
            return this._toHHMM(total);
        },

        formatValueState(sValue) {
            return sValue && sValue !== "" ? "Success" : "None";
        },

        onViewToggle(oEvent) {
            if (oEvent.getParameter("item").getKey() === "day") {
                MessageToast.show("Day view – coming soon.");
            }
        },

        // ── Helpers ──────────────────────────────────────────────────────────

        _parseHHMM(s) {
            if (!s || s === "") return 0;
            if (String(s).includes(":")) {
                const [h, m] = String(s).split(":");
                return (parseInt(h) || 0) + (parseInt(m) || 0) / 60;
            }
            return parseFloat(s) || 0;
        },

        _toHHMM(decimal) {
            const h = Math.floor(decimal);
            const m = Math.round((decimal - h) * 60);
            return `${h}:${String(m).padStart(2, "0")}`;
        }
    });
});
