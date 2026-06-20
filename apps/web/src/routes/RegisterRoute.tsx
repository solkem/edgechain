import { Navigate, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Register } from '../screens/Register';
import type { Farmer } from '../types/app';

export function RegisterRoute() {
  const { wallet, setFarmer } = useAppContext();
  const navigate = useNavigate();

  if (!wallet) {
    return <Navigate to="/" replace />;
  }

  const register = (data: Omit<Farmer, 'address' | 'joinedAt' | 'accuracy'>) => {
    const newFarmer: Farmer = {
      ...data,
      address: wallet.address,
      joinedAt: new Date(),
      accuracy: 87
    };
    localStorage.setItem(`farmer_${wallet.address}`, JSON.stringify(newFarmer));
    setFarmer(newFarmer);
    navigate('/selection');
  };

  const skip = () => {
    const guest: Farmer = {
      name: 'Guest Farmer',
      region: 'Unknown',
      crops: [],
      address: wallet.address,
      joinedAt: new Date(),
      accuracy: 0
    };
    setFarmer(guest);
    navigate('/selection');
  };

  return <Register address={wallet.address} onRegister={register} onSkip={skip} />;
}

