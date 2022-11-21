import { Head } from "$fresh/runtime.ts";

export default function Login() {
  return (
    <>
      <Head>
        <title>Fresh App</title>
      </Head>
      <div class="p-4 mx-auto max-w-screen-md">
        <a href="/login">Click to Login</a>
      </div>
    </>
  );
}
