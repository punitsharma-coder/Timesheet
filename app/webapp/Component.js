sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device"
], (UIComponent, Device) => {
    "use strict";

    return UIComponent.extend("timesheet.app.Component", {

        metadata: {
            manifest: "json"
        },

        init() {
            // Call parent init first (mandatory)
            UIComponent.prototype.init.apply(this, arguments);

            // Initialize the router
            this.getRouter().initialize();
        },

        getContentDensityClass() {
            // Use compact mode on desktop, cozy on touch devices
            return Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
        }
    });
});
