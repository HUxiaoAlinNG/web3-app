import Welcome from './components/Welcome';
import Transactions from './components/Transactions';

const App = () => (
  <div className="min-h-screen">
    <div className="gradient-bg-welcome">
      <Welcome />
    </div>
    <Transactions />
  </div>
);

export default App;
