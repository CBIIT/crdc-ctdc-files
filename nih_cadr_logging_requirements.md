# NIH CADR Logging Requirements

## 1. Events That Must Be Logged

Log the following event types:

1. **Authentication and authorization events**
   - Successful logins
   - Failed login attempts
   - Timed-out login attempts
   - Single sign-on events
   - Automated account lockouts
   - Logouts

2. **Data Access Request events**
   - DAR submissions
   - DAR approvals
   - DAR modifications
   - DAR rejections

3. **Data activity events**
   - Data access
   - Data downloads
   - Data uploads
   - Data deletion
   - Data archival
   - Data destruction

## 2. Required Log Fields

Include the following fields for each event, where applicable:

| Field | Description |
|---|---|
| `_time` | Date and time of the event, including the time zone |
| `event_type` | Type of event, such as authentication, data request, data access, download, upload, deletion, archival, or destruction |
| `user_id` | Unique user identifier from NIH, Login.gov, RAS, or another linked credential |
| `user_name` | User’s first and last name |
| `user_email` | User’s email address |
| `user_id_provider` | Identity provider, such as NIH, Login.gov, or RAS |
| `session_id` | Unique session identifier |
| `transaction_number` | Transaction number provided by RAS in the `txn` claim |
| `src_ip` | Source IP address |
| `dest_ip` | Destination IP address |
| `dest_port` | Destination port |
| `url` | Requested URL |
| `app` | Application or service accessed |
| `http_user_agent` | Browser or client application used |
| `status` | Outcome of the action, such as an HTTP status code |
| `http_content_type` | Content type of the HTTP response |
| `bytes` | Number of bytes transferred |
| `duration` | Duration of the connection or event |
| `nih_ico` | NIH Institute, Center, or Office, such as NCI |
| `cadr_name` | Name of the CADR, such as Cancer Data Service |
| `data_repository` | Name of the data repository accessed |
| `associated_study` | Study or dataset identifier, such as `phs000300` |
| `user_country_name` | User’s country, as recorded in the DAR |
| `user_org` | User’s institutional affiliation |
| `eRA_commons_id` | User’s eRA Commons ID, when applicable |
| `user_permission_group` | User’s permission group, such as dbGaP |

## 3. Data Access Logging Rules

When data is accessed:

- Record the name of the repository accessed.
- Record the study or dataset accessed.
- Log access to each repository as a separate event.
- Log access to each study or dataset as a separate event, even when multiple studies are accessed during the same session.
- Include the event type in every log entry.

## 4. Log Availability and Retention

Logs must:

- Be accessible to NIH upon request.
- Support investigations of data management and security incidents.
- Support identification of suspicious activity and required reporting.
- Remain in **active storage for 12 months**.
- Be moved to **cold storage for an additional 18 months**.
- Be retained for a total of **30 months**.
