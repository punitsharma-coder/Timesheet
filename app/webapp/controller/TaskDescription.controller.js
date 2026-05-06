sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast) => {
    "use strict";

    return Controller.extend("timesheet.app.controller.TaskDescription", {

        onInit() {
            this.getOwnerComponent().getRouter()
                .getRoute("task-description")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            this._loadTasks();
        },

        _loadTasks() {
            const oModel = this.getOwnerComponent().getModel();
            oModel.bindList("/MyTasks").requestContexts(0, 200)
                .then(aCtx => {
                    const tasks = aCtx.map(c => c.getObject());
                    const oJsonModel = new JSONModel({ MyTasks: tasks });
                    this.getView().setModel(oJsonModel);
                })
                .catch(() => {
                    // fallback sample data for local testing
                    const oJsonModel = new JSONModel({
                        // MyTasks: [
                        //     {
                        //         taskId: "TASK001",
                        //         taskName: "UI Development",
                        //         taskDescription: "Build weekly timesheet UI",
                        //         priority: "High",
                        //         status: "In Progress",
                        //         startDate: "2026-04-01",
                        //         dueDate: "2026-05-31"
                        //     },
                        //     {
                        //         taskId: "TASK002",
                        //         taskName: "CAP Backend",
                        //         taskDescription: "Create CAP service and entities",
                        //         priority: "High",
                        //         status: "In Progress",
                        //         startDate: "2026-04-01",
                        //         dueDate: "2026-05-31"
                        //     },
                        //     {
                        //         taskId: "TASK003",
                        //         taskName: "HR Review",
                        //         taskDescription: "Employee onboarding checklist",
                        //         priority: "Medium",
                        //         status: "Pending",
                        //         startDate: "2026-05-01",
                        //         dueDate: "2026-05-15"
                        //     },
                        //     {
                        //         taskId: "TASK004",
                        //         taskName: "Sales Followup",
                        //         taskDescription: "Client meeting updates",
                        //         priority: "Low",
                        //         status: "Completed",
                        //         startDate: "2026-04-15",
                        //         dueDate: "2026-04-30"
                        //     }
                        // ]
                    });
                    this.getView().setModel(oJsonModel);
                }
            );
        },

        onSearch(oEvent) {
            const sQuery = oEvent.getParameter("query");
            const oList  = this.byId("taskList");
            const oBinding = oList.getBinding("items");

            if (sQuery) {
                const oFilter = new Filter({
                    filters: [
                        new Filter("taskName",        FilterOperator.Contains, sQuery),
                        new Filter("taskDescription", FilterOperator.Contains, sQuery),
                        new Filter("taskId",          FilterOperator.Contains, sQuery)
                    ],
                    and: false
                });
                oBinding.filter([oFilter]);
            } else {
                oBinding.filter([]);
            }
        },

        onTaskPress(oEvent) {
            const oItem    = oEvent.getSource();
            const oContext = oItem.getBindingContext();
            const oTask    = oContext.getObject();
            MessageToast.show(`Task: ${oTask.taskName} — ${oTask.status}`);
        },

        onNavBack() {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        }
    });
});