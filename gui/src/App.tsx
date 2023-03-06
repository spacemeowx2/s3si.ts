import { useEffect } from "react";
import { getCurrent } from "@tauri-apps/api/window";
import { Routes, Route } from "react-router-dom";
import { Layout } from "components/Layout";
import { Home } from "pages/Home";
import { Settings } from "pages/Settings";

function App() {
  useEffect(() => {
    try {
      getCurrent().show().catch(e => console.error(e))
    } catch (e) {
      console.error(e)
    }
  }, [])
  return (
    <Routes>
      <Route path='/' element={<Layout />}>
        <Route index element={<Home />} />
        <Route path='/settings' element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
