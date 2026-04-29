sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel"
], (UIComponent, Device, JSONModel) => {
    "use strict";

    return UIComponent.extend("timesheet.app.Component", {

        metadata: { manifest: "json" },

        init() {
            UIComponent.prototype.init.apply(this, arguments);

            // Restore persisted data so history survives page refresh
            this.setModel(new JSONModel(this._fromStorage("tsHistory", { submissions: [] })), "history");
            this.setModel(new JSONModel(this._fromStorage("tsLocked",  {})), "locked");

            this.getRouter().initialize();
        },

        _fromStorage(sKey, oDefault) {
            try {
                const s = localStorage.getItem(sKey);
                return s ? JSON.parse(s) : oDefault;
            } catch (e) { return oDefault; }
        },

        persistHistory() {
            try { localStorage.setItem("tsHistory", JSON.stringify(this.getModel("history").getData())); } catch (e) {}
        },

        persistLocked() {
            try { localStorage.setItem("tsLocked",  JSON.stringify(this.getModel("locked").getData()));  } catch (e) {}
        },

        getContentDensityClass() {
            return Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
        }
    });
});
