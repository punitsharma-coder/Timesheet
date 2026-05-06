using EmployeeService from './timesheet-service';

// ── Task List Annotations ─────────────────────────────────────────────────────
annotate EmployeeService.MyTasks with @(
    UI.SelectionFields: [
        priority,
        status
    ],
    UI.LineItem: [
        { Value: taskId,          Label: 'Task ID'      },
        { Value: taskName,        Label: 'Task Name'    },
        { Value: taskDescription, Label: 'Description'  },
        { Value: priority,        Label: 'Priority',
          Criticality: {
            $edmJson: {
              $If: [
                { $Eq: [{ $Path: 'priority' }, 'High']   }, 1,
                { $If: [
                    { $Eq: [{ $Path: 'priority' }, 'Medium'] }, 2, 3
                ]}
              ]
            }
          }
        },
        { Value: status,          Label: 'Status'       },
        { Value: startDate,       Label: 'Start Date'   },
        { Value: dueDate,         Label: 'Due Date'     }
    ],
    UI.HeaderInfo: {
        TypeName:       'Task',
        TypeNamePlural: 'Tasks',
        Title:          { Value: taskName },
        Description:    { Value: taskDescription }
    },
    UI.FieldGroup#Details: {
        Label: 'Task Details',
        Data: [
            { Value: taskId,          Label: 'Task ID'      },
            { Value: taskName,        Label: 'Task Name'    },
            { Value: taskDescription, Label: 'Description'  },
            { Value: priority,        Label: 'Priority'     },
            { Value: status,          Label: 'Status'       },
            { Value: startDate,       Label: 'Start Date'   },
            { Value: dueDate,         Label: 'Due Date'     }
        ]
    },
    UI.Facets: [
        {
            $Type:  'UI.ReferenceFacet',
            Label:  'Task Details',
            Target: '@UI.FieldGroup#Details'
        }
    ]
);

// ── Field-level value helps ───────────────────────────────────────────────────
annotate EmployeeService.MyTasks with {
    priority @(
        Common.ValueList: {
            CollectionPath: 'MyTasks',
            Parameters: [
                { $Type: 'Common.ValueListParameterOut', LocalDataProperty: priority, ValueListProperty: 'priority' }
            ]
        }
    );
    status @(
        Common.ValueList: {
            CollectionPath: 'MyTasks',
            Parameters: [
                { $Type: 'Common.ValueListParameterOut', LocalDataProperty: status, ValueListProperty: 'status' }
            ]
        }
    );
}