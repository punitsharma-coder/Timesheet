sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], (Controller, MessageToast) => {
    "use strict";

    return Controller.extend("timesheet.app.controller.App", {

        onInit() {
            const oList = this.byId("mainNavList");
            const oFirst = oList?.getItems?.()?.[0];
            if (oFirst) oList.setSelectedItem(oFirst);
        },

        onMenuToggle() {
            // Toggle sidebar visibility via CSS class
            this.byId("app").toggleStyleClass("tsMasterHidden");
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
