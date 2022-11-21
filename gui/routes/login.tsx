import { Head } from "$fresh/runtime.ts";
import RedirectLogin from "../islands/RedirectLogin.tsx";

export default function Login() {
  return (
    <>
      <Head>
        <title>s3si.ts</title>
      </Head>
      <RedirectLogin />
    </>
  );
}
