import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { Graph, Node, Edge } from '@antv/x6'

interface UserAwareness {
  id: string;
  name: string;
  color: string;
  mouse?: { x: number; y: number };
}



export class Collaboration {
  private doc: Y.Doc
  private provider: HocuspocusProvider
  private graph: Graph
  private nodesMap: Y.Map<any>
  private edgesMap: Y.Map<any>
  private readyCallbacks: (() => void)[] = []
  private clientId: string
  private userColor: string
  private awarenessChangeCallback: ((users: UserAwareness[]) => void) | null = null;
  private username: string;

  constructor(graph: Graph, room: string, username: string, userColor: string) {
    if (!graph) {
      throw new Error('Graph instance is required');
    }
    this.graph = graph;
    this.username = username;
    this.userColor = userColor; // 使用传入的用户颜色
    this.doc = new Y.Doc();
    this.provider = new HocuspocusProvider({
      url: 'ws://localhost:1234',
      name: room,
      document: this.doc
    });
    this.nodesMap = this.doc.getMap('nodes')
    this.edgesMap = this.doc.getMap('edges')
    this.clientId = this.doc.clientID.toString()

    this.bindEvents()
    this.syncInitialState()

    this.provider.on('sync', (isSynced: boolean) => {
      if (isSynced) {
        this.setLocalAwareness()
        this.readyCallbacks.forEach(callback => callback())
        this.readyCallbacks = []
      }
    })

    this.provider.awareness?.on('change', this.handleAwarenessChange.bind(this))
  }

  onReady(callback: () => void) {
    if (this.provider.synced) {
      callback();
      this.handleAwarenessChange(); // 立即触发一次awareness变化
    } else {
      this.readyCallbacks.push(() => {
        callback();
        this.handleAwarenessChange(); // 在ready回调中触发awareness变化
      });
    }
  }

  addNode(nodeData: any) {
    const node = this.graph.addNode(nodeData);
    this.updateNode(node);
    return node;
  }

  destroy() {
    this.provider.awareness!.setLocalState(null)
    this.provider.destroy()
    this.doc.destroy()
  }

  setNodeOperator(node: Node): boolean {
    const currentData = node.getData() || {}; // 果 getData() 返回 undefined，使用空对象
    if (!currentData.operator) {
      const operatorInfo: UserAwareness = this.getLocalState();
      node.setData({ ...currentData, operator: operatorInfo }, { ignoreSync: true });
      this.updateNode(node);
      return true;
    }
    return false;
  }

  clearNodeOperator(node: Node) {
    const data = node.getData();
    if (this.isCurrentUserOperator(data)) {
      node.setData({...data, operator: null}, { ignoreSync: true });
      this.updateNode(node);
    }
  }

  canOperate(cell: Node | Edge): boolean {
    const data = cell.getData() || {};
    return !data.operator || data.operator.id === this.clientId;
  }

  isCurrentUserOperator(data: Record<string, any>): boolean {
    return data.operator && data.operator.id === this.clientId;
  }


  updateMousePosition(clientX: number, clientY: number) {
    const localPoint = this.graph.clientToLocal({
      x: clientX ,
      y: clientY,
    });

    const state = this.provider.awareness!.getLocalState() as UserAwareness;
    if (state) {
      state.mouse = { x: localPoint.x, y: localPoint.y }; // 更新为本地坐标
      this.provider.awareness!.setLocalState(state);
    }
  }

  onAwarenessChange(callback: (users: UserAwareness[]) => void) {
    this.awarenessChangeCallback = callback;
    this.provider.awareness?.on('change', this.handleAwarenessChange.bind(this));
  }

  private handleAwarenessChange() {
    if (this.awarenessChangeCallback) {
      const users = this.getUsers();
      this.awarenessChangeCallback(users);
    }
  }

  getUsers(): UserAwareness[] {
    const users: UserAwareness[] = [];
    this.provider.awareness!.getStates().forEach((state: any, clientId: number) => {
      if (state && clientId.toString() !== this.clientId && state.mouse?.x !== undefined) {
        users.push(state as UserAwareness);
      }
    });
    return users;
  }

  getCurrentUserColor(): string {
    return this.userColor
  }

  private setLocalAwareness() {
    const state: UserAwareness = {
      id: this.clientId,
      name: this.username,
      color: this.userColor,
    }
    this.provider.awareness!.setLocalState(state)
  }

  private bindEvents() {
    if (!this.graph) {
      console.warn('Graph is not initialized');
      return;
    }
    this.graph.on('node:added', ({ node }) => {
      console.log('Node added:', node.id);
      this.updateNode(node);
    });
    this.graph.on('node:removed', ({ node }) => this.removeNode(node))

    this.graph.on('edge:added', ({ edge }) => this.updateEdge(edge))
    this.graph.on('edge:removed', ({ edge }) => this.removeEdge(edge))
    this.graph.on('edge:changed', ({ edge }) => this.updateEdge(edge))

    this.nodesMap.observe(event => {
      console.log('NodesMap changed:', event);
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const nodeData = this.nodesMap.get(key);
          console.log('Updating graph node:', key, nodeData);
          this.updateGraphNode(key, nodeData);
        } else if (change.action === 'delete') {
          console.log('Removing graph node:', key);
          this.graph.removeCell(key);
        }
      })
    })

    this.edgesMap.observe(event => {
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const edgeData = this.edgesMap.get(key)
          this.updateGraphEdge(key, edgeData)
        } else if (change.action === 'delete') {
          this.graph.removeCell(key)
        }
      })
    })
  }

  private syncInitialState() {
    console.log('Syncing initial state');
    this.nodesMap.forEach((nodeData, id) => {
      console.log('Syncing node:', id, nodeData);
      this.updateGraphNode(id, nodeData);
    });
    this.edgesMap.forEach((edgeData, id) => {
      console.log('Syncing edge:', id, edgeData);
      this.updateGraphEdge(id, edgeData);
    });
  }

  private updateNode(node: Node) {
    const nodeData = node.toJSON();
    // 移除外观相关的属性
    if (nodeData.attrs && nodeData.attrs.body) {
      delete nodeData.attrs.body.stroke;
      delete nodeData.attrs.body.strokeWidth;
    }
    this.nodesMap.set(node.id, nodeData);
  }

  private removeNode(node: Node) {
    this.nodesMap.delete(node.id)
  }

  private updateEdge(edge: Edge) {
    this.edgesMap.set(edge.id, edge.toJSON())
  }

  private removeEdge(edge: Edge) {
    this.edgesMap.delete(edge.id)
  }

  private updateGraphNode(id: string, data: any) {
    const cell = this.graph.getCellById(id)
    if (cell instanceof Node) {
      cell.prop(data)
    } else {
      this.graph.addNode(data)
    }
  }

  private updateGraphEdge(id: string, data: any) {
    const cell = this.graph.getCellById(id)
    if (cell instanceof Edge) {
      cell.prop(data)
    } else {
      this.graph.addEdge(data)
    }
  }

  getLocalState(): UserAwareness {
    return this.provider.awareness!.getLocalState() as UserAwareness;
  }

  updateNodePosition(node: Node) {
    const { id } = node;
    const position = node.getPosition();
    const size = node.getSize();
    console.log(`Updating node ${id}:`, { position, size });
    if (position && position.x != null && position.y != null && size && size.width != null && size.height != null) {
      this.nodesMap.set(id, { id, position, size });
    } else {
      console.warn(`Invalid position or size for node ${id}`, { position, size });
    }
  }

  getAllUsers(): UserAwareness[] {
    const users: UserAwareness[] = [];
    this.provider.awareness!.getStates().forEach((state: any, clientId: number) => {
      if (state && clientId.toString() !== this.clientId) {
        users.push(state as UserAwareness);
      }
    });
    return users;
  }
}