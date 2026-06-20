import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Aggregation } from '../screens/Aggregation';

export function AggregationRoute() {
  const { round, submissions, aggregating, progress, version, setAggregating, setProgress } = useAppContext();
  const navigate = useNavigate();

  return (
    <Aggregation
      round={round}
      submissions={submissions}
      aggregating={aggregating}
      progress={progress}
      version={version}
      onTrigger={() => { setAggregating(true); setProgress(0); }}
      onBack={() => navigate('/train')}
    />
  );
}

