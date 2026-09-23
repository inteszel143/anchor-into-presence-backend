import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * Root Layout Component
 * 
 * Serves as the top-level application wrapper providing:
 * - Global CSS stylesheets and third-party JS scripts.
 * - Global Toast notifications via `react-toastify`.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="stylesheet" href="/assets/css/stylesheet.css" />
        <title>Meditation Admin & Web</title>
      </head>
      <body>
        <div>
          {children}
          <ToastContainer position="top-right" autoClose={3000} limit={1}/>
        </div>
        {/* External and local JS scripts */}
        <script src="/assets/js/popper.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
        <script src="https://cdn.jsdelivr.net/momentjs/latest/moment.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js"></script>
        <script src="/assets/js/bootstrap.min.js"></script>
        <script src="/assets/js/style.js"></script>
      </body>
    </html>
  );
}

