import { useEffect, useState } from 'preact/hooks'

export default function RedirectLogin() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/login_iksm");
      const { url } = await response.json();
      setLoaded(true)
      window.location.href = url
    })()
  }, [])

  return (
    <>
      <div class="p-4 mx-auto max-w-screen-md">
        {!loaded ? 'Getting login url...' : 'Redirecting...'}
      </div>
    </>
  );
}
