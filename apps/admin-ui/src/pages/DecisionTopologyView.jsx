import React, { useCallback, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ArrowLeft, Save, Zap } from 'lucide-react';

const DecisionTopologyView = ({ config, onBack }) => {
  // 1. Transform JSON Gates into Flow Nodes
  const initialNodes = useMemo(() => {
    const nodes = [
      { 
        id: 'input', 
        data: { label: 'User Intent & Profile' }, 
        position: { x: 50, y: 150 },
        style: { background: 'var(--accent-primary)', color: 'white', fontWeight: 'bold', borderRadius: '8px', padding: '10px' }
      }
    ];

    let yOffset = 0;
    Object.entries(config.gates || {}).forEach(([id, gate], index) => {
      nodes.push({
        id: `gate_${id}`,
        data: { label: `${gate.humanMeaning || id}\n(w: ${gate.weight})` },
        position: { x: 300, y: index * 100 },
        style: { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '8px', padding: '10px', fontSize: '12px' }
      });
    });

    nodes.push({
      id: 'output',
      data: { label: 'Optimal Recommendations' },
      position: { x: 600, y: 150 },
      style: { background: 'var(--success)', color: 'white', fontWeight: 'bold', borderRadius: '8px', padding: '10px' }
    });

    return nodes;
  }, [config]);

  // 2. Transform into Edges
  const initialEdges = useMemo(() => {
    const edges = [];
    Object.keys(config.gates || {}).forEach((id) => {
      edges.push({
        id: `e-input-${id}`,
        source: 'input',
        target: `gate_${id}`,
        animated: true,
        style: { stroke: 'var(--accent-primary)' }
      });
      edges.push({
        id: `e-${id}-output`,
        source: `gate_${id}`,
        target: 'output',
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--success)' },
        style: { stroke: 'var(--border-subtle)' }
      });
    });
    return edges;
  }, [config]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="page-content" style={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: 600 }}>
            <ArrowLeft size={18} /> Back to Editor
          </button>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Cognitive <span className="text-gradient">Topology</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Visualizing the flow of constraints and weights.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline"><Zap size={18} /> Simulate Load</button>
          <button className="btn btn-primary"><Save size={18} /> Save Layout</button>
        </div>
      </div>

      <div style={{ flex: 1, background: '#0a0a14', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Background color="#1e1e2d" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
};

export default DecisionTopologyView;
