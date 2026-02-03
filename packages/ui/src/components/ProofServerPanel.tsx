/**
 * ProofServerPanel - Real-time proof server status component
 */

import React from 'react';
import { useProofServerConnection, useProofServerStatus, useProofEvents } from '../lib/useProofServer';

export const ProofServerPanel: React.FC = () => {
    const { connected, health, error: connectionError, refresh } = useProofServerConnection();
    const { status, loading, error: statusError } = useProofServerStatus(3000);
    const { lastProof, proofHistory } = useProofEvents();

    return (
        <div className="proof-server-panel">
            <div className="panel-header">
                <h3>🛰️ Proof Server</h3>
                <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
                    {connected ? '● Connected' : '○ Disconnected'}
                </div>
            </div>

            {(connectionError || statusError) && (
                <div className="error-banner">
                    ⚠️ {connectionError || statusError}
                    <button onClick={refresh}>Retry</button>
                </div>
            )}

            {health && (
                <div className="health-grid">
                    <div className="health-item">
                        <span className="label">Status</span>
                        <span className={`value status-${health.status}`}>
                            {health.status === 'healthy' ? '✅ Healthy' : '❌ Unhealthy'}
                        </span>
                    </div>
                    <div className="health-item">
                        <span className="label">LoRa</span>
                        <span className={`value ${health.components.lora ? 'active' : 'inactive'}`}>
                            {health.components.lora ? '📡 Connected' : '📡 Offline'}
                        </span>
                    </div>
                    <div className="health-item">
                        <span className="label">Midnight</span>
                        <span className={`value ${health.components.midnight ? 'active' : 'inactive'}`}>
                            {health.components.midnight ? '🌙 Connected' : '🌙 Offline'}
                        </span>
                    </div>
                    <div className="health-item">
                        <span className="label">Uptime</span>
                        <span className="value">
                            {formatUptime(health.uptime)}
                        </span>
                    </div>
                </div>
            )}

            {status && !loading && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{status.deviceCount}</div>
                        <div className="stat-label">Registered Devices</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{status.proofsGenerated}</div>
                        <div className="stat-label">Proofs Generated</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{status.loraStats.packetsReceived}</div>
                        <div className="stat-label">LoRa Packets</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">
                            {status.loraStats.averageRssi ? `${status.loraStats.averageRssi.toFixed(0)} dBm` : 'N/A'}
                        </div>
                        <div className="stat-label">Avg RSSI</div>
                    </div>
                </div>
            )}

            {lastProof && (
                <div className="last-proof">
                    <h4>Latest Proof</h4>
                    <div className="proof-details">
                        <div className="detail">
                            <span className="label">Nullifier</span>
                            <code>{lastProof.nullifier.slice(0, 16)}...</code>
                        </div>
                        <div className="detail">
                            <span className="label">TX Hash</span>
                            <code>{lastProof.txHash.slice(0, 16)}...</code>
                        </div>
                        <div className="detail">
                            <span className="label">Time</span>
                            <span>{new Date(lastProof.timestamp).toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            )}

            {proofHistory.length > 0 && (
                <div className="proof-history">
                    <h4>Recent Proofs ({proofHistory.length})</h4>
                    <div className="history-list">
                        {proofHistory.slice(-5).reverse().map((proof, i) => (
                            <div key={i} className="history-item">
                                <span className="time">
                                    {proof && new Date(proof.timestamp).toLocaleTimeString()}
                                </span>
                                <code>{proof?.nullifier.slice(0, 12)}...</code>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
        .proof-server-panel {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          padding: 24px;
          color: #fff;
          font-family: 'Inter', sans-serif;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 1.25rem;
        }

        .connection-status {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.875rem;
        }

        .connection-status.connected {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .connection-status.disconnected {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-banner button {
          background: #ef4444;
          color: white;
          border: none;
          padding: 4px 12px;
          border-radius: 4px;
          cursor: pointer;
        }

        .health-grid, .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .health-item {
          background: rgba(255, 255, 255, 0.05);
          padding: 12px;
          border-radius: 8px;
        }

        .health-item .label {
          display: block;
          font-size: 0.75rem;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .health-item .value {
          font-weight: 600;
        }

        .health-item .value.active {
          color: #22c55e;
        }

        .health-item .value.inactive {
          color: #6b7280;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.05);
          padding: 16px;
          border-radius: 12px;
          text-align: center;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 4px;
        }

        .last-proof, .proof-history {
          background: rgba(255, 255, 255, 0.05);
          padding: 16px;
          border-radius: 12px;
          margin-top: 16px;
        }

        .last-proof h4, .proof-history h4 {
          margin: 0 0 12px 0;
          font-size: 0.875rem;
          color: #94a3b8;
        }

        .proof-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail .label {
          color: #6b7280;
          font-size: 0.875rem;
        }

        code {
          background: rgba(0, 0, 0, 0.3);
          padding: 2px 8px;
          border-radius: 4px;
          font-family: 'Fira Code', monospace;
          font-size: 0.75rem;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
        }

        .history-item .time {
          color: #6b7280;
          font-size: 0.75rem;
        }
      `}</style>
        </div>
    );
};

function formatUptime(seconds: number): string {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}

export default ProofServerPanel;
