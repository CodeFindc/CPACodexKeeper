import { Navigate, Route, Routes } from 'react-router-dom'
import StatusShell from './components/StatusShell'
import { LanguageProvider } from './i18n'
import AccountView from './views/AccountView'
import StatusView from './views/StatusView'

export default function App() {
  return (
    <LanguageProvider>
      <Routes>
        <Route element={<StatusShell />}>
          <Route index element={<StatusView />} />
          <Route path="account" element={<AccountView />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LanguageProvider>
  )
}
