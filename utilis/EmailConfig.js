import nodemailer from 'nodemailer';

const emailConfig = async ({ verificationCode, Email }) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "schaingokul@gmail.com",
        pass: "sjja hpwf uipx aewp",
      },
    });
  
    const mailOptions = {
      from: "schaingokul@gmail.com",
      to: "vigneshbalanmvgs2003@gmail.com", Email, 
      subject: "Verify Your Account",
      text: `Your verification code is: ${verificationCode}`,
    };
  
    
    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
          reject(false);
        } else {
          console.log("Email sent successfully:", info.response);
          resolve(true); 
        }
      });
    });
  };

export default emailConfig;