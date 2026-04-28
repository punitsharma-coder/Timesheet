using { ccentrik.employee.timesheet.schema as db } from '../db/data-model';

service EmployeeService @(path:'/employee') {

    entity MyTimesheets as projection on db.timesheet.TimesheetHeader;
    entity MyEntries as projection on db.timesheet.TimesheetEntry;
    entity MyTasks as projection on db.timesheet.TaskMaster;
}

service ManagerService @(path:'/manager') {

    entity PendingApprovals as projection on db.timesheet.TimesheetHeader;
    entity ApprovalEntries as projection on db.timesheet.TimesheetEntry;
    entity Employees as projection on db.timesheet.EmployeeMaster;
}