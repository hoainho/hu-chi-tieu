import React from 'react';
import { useAppSelector } from '../../store';

const ReduxDebugger: React.FC = () => {
  const userState = useAppSelector(state => state.user);
  const accountState = useAppSelector(state => state.account);
  const transactionState = useAppSelector(state => state.transaction);

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-md max-h-96 overflow-auto z-50">
      <h3 className="font-bold mb-2">Redux Debug</h3>
      
      <div className="mb-2">
        <strong>User State:</strong>
        <pre>{JSON.stringify(userState, null, 2)}</pre>
      </div>
      
      <div className="mb-2">
        <strong>Account State:</strong>
        <pre>{JSON.stringify(accountState, null, 2)}</pre>
      </div>
      
      <div className="mb-2">
        <strong>Transaction State:</strong>
        <pre>{JSON.stringify(transactionState, null, 2)}</pre>
      </div>
    </div>
  );
};

export default ReduxDebugger;
