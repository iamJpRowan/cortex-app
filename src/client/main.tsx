import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './graphql/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ApolloProvider client={apolloClient}>
        <App />
      </ApolloProvider>
    </ErrorBoundary>
  </React.StrictMode>
);


