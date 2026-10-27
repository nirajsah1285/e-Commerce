
import "dotenv/config";
import { Resend } from "resend";

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.RESEND_TEST_TO;

  if (!apiKey || !recipient) {
    console.error(
      "Missing RESEND_API_KEY or RESEND_TEST_TO in .env"
    );
    process.exitCode = 1;
    return;
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: "Manpasand Test <onboarding@resend.dev>",
      to: [recipient],
      subject: "Manpasand - Test Email",
      text: "Success! Your Manpasand backend can connect to Resend."
    });

    if (error) {
      console.error("Resend rejected the email:", error.message);
      process.exitCode = 1;
      return;
    }

    console.log("Email request accepted by Resend.");
    console.log("Email ID:", data?.id ?? "Not returned");
    console.log("Check your inbox and spam folder.");
  } catch (error) {
    console.error("Email test failed:", error.message);
    process.exitCode = 1;
  }
}

main();
