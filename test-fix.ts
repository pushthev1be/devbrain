import { useEffect, useState } from 'react';
import { eventEmitter } from './emitter';

export function UserStatus() {
  const [status, setStatus] = useState('offline');

  useEffect(() => {
    // FIX: Registered and cleaned up the event listener to close the memory leak!
    const handleStatus = (newStatus: string) => setStatus(newStatus);
    eventEmitter.on('statusChange', handleStatus);
    return () => {
      eventEmitter.off('statusChange', handleStatus);
    };
  }, []);

  return <div>Status: {status}</div>;
}
