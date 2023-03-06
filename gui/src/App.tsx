import 'i18n/config';
import { Routes, Route } from "react-router-dom";
import { Layout } from "components/Layout";
import { Home } from "pages/Home";
import { Settings } from "pages/Settings";
import { Guide } from 'pages/Guide';
import { RedirectLogin } from 'pages/RedirectLogin';
import { useShowWindow } from 'hooks/useShowWindow';

function App() {
  useShowWindow();
  return (
    <Routes>
      <Route path='/' element={<Layout />}>
        <Route index element={<Home />} />
        <Route path='/settings' element={<Settings />} />
        <Route path='/guide' element={<Guide />} />
        <Route path='/redirect' element={<RedirectLogin />} />
      </Route>
    </Routes>
  );
}

export default App;
