export const getEmailContent = ({
  id,
  isUrgent,
}: {
  id: string;
  isUrgent: boolean;
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
        } reminder that there's no matching record in SEA Tool for ${id}.</h2>
        <br>
        <p>Either a record wasn't created in SEA Tool, or the SPA ID in Appian and SEA Tool don't match.</p>
        ${
          isUrgent
            ? "<em>Failure to address this could lead to critical delay in the review process and a deemed aproved SPA.</em>"
            : ""
        }
        <br>
        <div style=' background-color: rgb(22, 82, 150); width: 580px; padding: 20px; margin: 20px; color: white;'> if you have any questions, please contact the help desk at <a href="mailto:SEATool_helpDesk@cms.hhs.org" style="color:#ffffff;">SEATool_helpDesk@cms.hhs.org</a> </div>
        </center>
      </body>
    </html>
  `;

  const textData = `
    This is a reminder that there's no matching record in SEA Tool for ${id}. Either a record wasn't created in SEA Tool, or the SPA ID in MMDL and SEA Tool don't match.
  `;

  return {
    htmlData,
    textData,
  };
};
