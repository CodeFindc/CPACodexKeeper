import { Navigate, Route, Routes } from 'react-router-dom'
import StatusShell from './components/StatusShell'
import AccountView from './views/AccountView'
import StatusView from './views/StatusView'

export default function App() {
  return (
    <Routes>
      <Route element={<StatusShell />}>
        <Route index element={<StatusView />} />
        <Route path="account" element={<AccountView />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
