import nodemailer from 'nodemailer'; //vigneshbalanmvgs2003@gmail.com

const emailConfig = async ({ code, Email }) => {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "schaingokul@gmail.com",
        pass: "jruv vauv oqcd qlbd",
      },
    });
  
    const mailOptions = {
      from: "schaingokul@gmail.com",
      to: "sportspersonapp@gmail.com", 
      subject: "Verify Your Account",
      text: `Your verification code is: ${code}, Your Email Address is: ${Email}`,
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