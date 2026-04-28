sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], (Controller, MessageToast) => {
    "use strict";

    return Controller.extend("timesheet.app.controller.App", {

        onInit() {
            // Select the first nav item by default
            const oList = this.byId("navList");
            const oFirstItem = oList?.getItems?.()?.[0];
            if (oFirstItem) {
                oList.setSelectedItem(oFirstItem);
            }
        },

        onNavSelect(oEvent) {
            const oItem   = oEvent.getParameter("listItem");
            const sTarget = oItem.data("target");
            if (sTarget) {
                this.getOwnerComponent().getRouter().navTo(sTarget);
            }
        },

        onLogout() {
            MessageToast.show("Logging out...");
        },

        onProfilePress() {
            MessageToast.show("Profile");
        }
    });
});
