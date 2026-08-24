// Column headers + example row for each import entity, shared by the
// downloadImportTemplate backend function. Keep header labels in sync with
// the field labels used by the Data Import mapping UI.
export const TEMPLATE_COLUMNS: Record<string, { headers: string[]; example: Record<string, string> }> = {
  Client: {
    headers: [
      "Client Name", "Company", "Billing Contact", "Billing Email", "Billing Phone",
      "Billing Address", "Terms", "Default Rate", "QB Customer ID", "Portal Email",
      "Portal Access", "Notes"
    ],
    example: {
      "Client Name": "Acme Realty",
      "Company": "Acme Corp",
      "Billing Contact": "Jane Doe",
      "Billing Email": "jane@acme.com",
      "Billing Phone": "555-0100",
      "Billing Address": "123 Main St, Minneapolis, MN 55401",
      "Terms": "Net 30",
      "Default Rate": "150",
      "QB Customer ID": "",
      "Portal Email": "jane@acme.com",
      "Portal Access": "limited",
      "Notes": "Preferred contact by email"
    }
  },
  Project: {
    headers: ["Project Name", "Client Name", "Description", "Status", "Region", "Start Date", "End Date", "Notes"],
    example: {
      "Project Name": "Downtown Tower Scan",
      "Client Name": "Acme Realty",
      "Description": "Full 3D scan of 10-story office tower",
      "Status": "active",
      "Region": "Midwest",
      "Start Date": "2026-09-01",
      "End Date": "2026-10-15",
      "Notes": ""
    }
  },
  Job: {
    headers: [
      "Job Title", "Project Name", "Client Name", "Site Address", "Latitude", "Longitude",
      "Priority", "Scheduled Start", "Scheduled End", "Est. Duration (hrs)", "Rate Type",
      "Billable Rate", "Status", "Required Equipment", "Deliverables", "Notes"
    ],
    example: {
      "Job Title": "Lobby LiDAR Scan",
      "Project Name": "Downtown Tower Scan",
      "Client Name": "Acme Realty",
      "Site Address": "123 Main St, Minneapolis, MN 55401",
      "Latitude": "44.9778",
      "Longitude": "-93.2650",
      "Priority": "high",
      "Scheduled Start": "2026-09-02T09:00:00Z",
      "Scheduled End": "2026-09-02T17:00:00Z",
      "Est. Duration (hrs)": "8",
      "Rate Type": "hourly",
      "Billable Rate": "150",
      "Status": "scheduled",
      "Required Equipment": "LiDAR Scanner, Tripod",
      "Deliverables": "Point cloud + 3D model",
      "Notes": ""
    }
  }
};