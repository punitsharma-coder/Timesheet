const cds = require('@sap/cds');

// Fully-qualified DB entity names (used in CQL to bypass service projections/filters)
const HEADER = 'ccentrik.employee.timesheet.schema.timesheet.TimesheetHeader';
const ENTRY  = 'ccentrik.employee.timesheet.schema.timesheet.TimesheetEntry';

// ─────────────────────────────────────────────────────────────────────────────
// Employee Service
// Handles: submitTimesheet
// ─────────────────────────────────────────────────────────────────────────────
class EmployeeService extends cds.ApplicationService {

    async init() {

        /**
         * submitTimesheet(timesheetId)
         *
         * Allowed transitions: Draft → Submitted, Rejected → Submitted
         *
         * On success:
         *   - TimesheetHeader.status        = 'Submitted'
         *   - TimesheetHeader.submittedOn   = now
         *   - TimesheetEntry.isLocked       = true
         *   - TimesheetEntry.entryStatus    = 'Locked'
         */
        this.on('submitTimesheet', async (req) => {
            const { timesheetId } = req.data;

            // Validate the timesheet exists
            const header = await SELECT.one.from(HEADER).where({ timesheetId });
            if (!header) {
                return req.error(404, `Timesheet '${timesheetId}' not found.`);
            }

            // Only Draft or Rejected timesheets can be submitted
            if (!['Draft', 'Rejected'].includes(header.status)) {
                return req.error(400,
                    `Cannot submit — current status is '${header.status}'. ` +
                    `Only 'Draft' or 'Rejected' timesheets can be submitted.`
                );
            }

            // Update header
            await UPDATE(HEADER)
                .set({ status: 'Submitted', submittedOn: new Date() })
                .where({ timesheetId });

            // Lock all entries belonging to this timesheet
            await UPDATE(ENTRY)
                .set({ isLocked: true, entryStatus: 'Locked' })
                .where({ timesheet_timesheetId: timesheetId });

            return `Timesheet '${timesheetId}' submitted. Waiting for manager approval.`;
        });

        return super.init();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Manager Service
// Handles: approveTimesheet, rejectTimesheet
// ─────────────────────────────────────────────────────────────────────────────
class ManagerService extends cds.ApplicationService {

    async init() {

        /**
         * approveTimesheet(timesheetId, remarks?)
         *
         * Allowed transition: Submitted → Approved
         *
         * On success:
         *   - TimesheetHeader.status        = 'Approved'
         *   - TimesheetHeader.approvedOn    = now
         *   - TimesheetHeader.remarks       = remarks
         *   - TimesheetEntry.isLocked       = true   (stays locked — greyed out in UI)
         *   - TimesheetEntry.entryStatus    = 'Approved'
         */
        this.on('approveTimesheet', async (req) => {
            const { timesheetId, remarks } = req.data;

            const header = await SELECT.one.from(HEADER).where({ timesheetId });
            if (!header) {
                return req.error(404, `Timesheet '${timesheetId}' not found.`);
            }

            if (header.status !== 'Submitted') {
                return req.error(400,
                    `Cannot approve — current status is '${header.status}'. ` +
                    `Only 'Submitted' timesheets can be approved.`
                );
            }

            // Approve the header
            await UPDATE(HEADER)
                .set({
                    status:     'Approved',
                    approvedOn: new Date(),
                    remarks:    remarks || ''
                })
                .where({ timesheetId });

            // Keep entries locked and mark them Approved (greyed out in History)
            await UPDATE(ENTRY)
                .set({ isLocked: true, entryStatus: 'Approved' })
                .where({ timesheet_timesheetId: timesheetId });

            return `Timesheet '${timesheetId}' approved.`;
        });

        /**
         * rejectTimesheet(timesheetId, remarks)
         *
         * Allowed transition: Submitted → Rejected
         *
         * On success:
         *   - TimesheetHeader.status        = 'Rejected'
         *   - TimesheetHeader.rejectedOn    = now
         *   - TimesheetHeader.remarks       = remarks
         *   - TimesheetEntry.isLocked       = false  (unlocked — employee can re-edit)
         *   - TimesheetEntry.entryStatus    = 'Open'
         */
        this.on('rejectTimesheet', async (req) => {
            const { timesheetId, remarks } = req.data;

            const header = await SELECT.one.from(HEADER).where({ timesheetId });
            if (!header) {
                return req.error(404, `Timesheet '${timesheetId}' not found.`);
            }

            if (header.status !== 'Submitted') {
                return req.error(400,
                    `Cannot reject — current status is '${header.status}'. ` +
                    `Only 'Submitted' timesheets can be rejected.`
                );
            }

            // Reject the header
            await UPDATE(HEADER)
                .set({
                    status:     'Rejected',
                    rejectedOn: new Date(),
                    remarks:    remarks || ''
                })
                .where({ timesheetId });

            // Unlock entries so the employee can edit and resubmit
            await UPDATE(ENTRY)
                .set({ isLocked: false, entryStatus: 'Open' })
                .where({ timesheet_timesheetId: timesheetId });

            return `Timesheet '${timesheetId}' rejected. Employee can edit and resubmit.`;
        });

        return super.init();
    }
}

module.exports = { EmployeeService, ManagerService };
