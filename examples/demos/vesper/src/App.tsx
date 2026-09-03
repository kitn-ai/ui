import { Loading } from 'solid-js';
import { Router } from './router';
import './styles/tokens.css';
import './styles/base.css';

export default function App() {
  return (
    <Router>
      {(props) => <Loading fallback={null}>{props.children}</Loading>}
    </Router>
  );
}
