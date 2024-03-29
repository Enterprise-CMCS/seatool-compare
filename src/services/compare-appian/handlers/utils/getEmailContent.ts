export const getEmailContent = ({
  id,
  isUrgent,
  seatoolSubdomain = "sea",
}: {
  id: string;
  isUrgent: boolean;
  seatoolSubdomain?: string;
}) => {
  const htmlData = `
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta http-equiv='X-UA-Compatible' content='IE=edge'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    </head>
    <body>
        <center>
        <h2>This is ${
          isUrgent ? "an urgent" : "a"
        } reminder that there's no matching record in <a href="https://${seatoolSubdomain}.cms.gov/" target="_blank">SEA Tool</a> for ${id}.</h2>
        <br>
        <p>Either a record wasn't created in SEA Tool, or the SPA ID in Appian and SEA Tool don't match.</p>
        ${
          isUrgent
            ? "<em>Failure to address this could lead to critical delays in the review process and a deemed approved SPA action.</em>"
            : ""
        }
        <br>
        <div style=' background-color: rgb(22, 82, 150); padding: 20px; margin: 20px; color: white;'>Please respond to this email address, <a href="mailto:SEATool_HelpDesk@cms.hhs.gov" style="color:#ffffff;">SEATool_HelpDesk@cms.hhs.gov</a>, if you have any further questions. </div>
        </center>
      </body>
    </html>
  `;

  const textData = `
    This is a reminder that there's no matching record in SEA Tool for ${id}. Either a record wasn't created in SEA Tool, or the SPA ID in Appian and SEA Tool don't match.
  `;

  return {
    htmlData,
    textData,
  };
};
