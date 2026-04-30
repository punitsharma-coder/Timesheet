sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], (Controller, JSONModel, MessageToast) => {
    "use strict";

    return Controller.extend("timesheet.app.controller.Notifications", {

        onInit() {
            this._oNotifViewModel = new JSONModel({
                notifications:   [],
                unreadCount:     0,
                hasNotifications: false
            });
            this.getView().setModel(this._oNotifViewModel, "notifView");

            this.getOwnerComponent().getRouter()
                .getRoute("notifications")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            this._loadNotifications();
        },

        _loadNotifications() {
            const oNotifModel = this.getOwnerComponent().getModel("notifications");
            const items       = oNotifModel.getProperty("/items") || [];

            // Sort newest first
            const sorted = [...items].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const unread  = sorted.filter(n => !n.read).length;

            this._oNotifViewModel.setProperty("/notifications",    sorted);
            this._oNotifViewModel.setProperty("/unreadCount",      unread);
            this._oNotifViewModel.setProperty("/hasNotifications", sorted.length > 0);
        },

        // ── Mark all read ────────────────────────────────────────────────────
        onMarkAllRead() {
            const oNotifModel = this.getOwnerComponent().getModel("notifications");
            const items       = oNotifModel.getProperty("/items") || [];
            items.forEach(n => { n.read = true; });
            oNotifModel.setProperty("/items", items);
            this.getOwnerComponent().persistNotifications();
            this._loadNotifications();
            MessageToast.show("All notifications marked as read.");
        },

        // ── Formatters ────────────────────────────────────────────────────────
        formatTypeIcon(sType) {
            return sType === "approved" ? "sap-icon://accept" : "sap-icon://decline";
        },

        formatTypeColor(sType) {
            return sType === "approved" ? "#16a34a" : "#dc2626";
        },

        formatTypeLabel(sType) {
            return sType === "approved" ? "Approved" : "Rejected";
        },

        formatTypeState(sType) {
            return sType === "approved" ? "Success" : "Error";
        },

        formatTimestamp(sTimestamp) {
            if (!sTimestamp) return "";
            const d = new Date(sTimestamp);
            return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) +
                   "  " +
                   d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        }
    });
});
