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

  constructor(graph: Graph, room: string) {
    this.graph = graph
    this.doc = new Y.Doc()
    this.provider = new HocuspocusProvider({
      url: 'ws://localhost:1234',
      name: room,
      document: this.doc
    })
    this.nodesMap = this.doc.getMap('nodes')
    this.edgesMap = this.doc.getMap('edges')
    this.clientId = this.doc.clientID.toString()
    this.userColor = this.generateRandomColor()

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
      callback()
    } else {
      this.readyCallbacks.push(callback)
    }
  }

  addNode(nodeData: any) {
    const node = this.graph.addNode({
      ...nodeData,
      data: {
        ...nodeData.data,
      },
    })
    this.updateNode(node)
    return node
  }

  destroy() {
    this.provider.awareness!.setLocalState(null)
    this.provider.destroy()
    this.doc.destroy()
  }

  isNodeLocked(nodeId: string): boolean {
    const node = this.graph.getCellById(nodeId) as Node
    if (!node) return false
    const data = node.getData() || {}
    const lockState = data.lockState || { isLocked: false, lockedBy: null }
    return lockState.isLocked && lockState.lockedBy !== this.clientId
  }

  updateMousePosition(x: number, y: number) {
    const state = this.provider.awareness!.getLocalState() as UserAwareness
    if (state) {
      state.mouse = { x, y }
      this.provider.awareness!.setLocalState(state)
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

  private generateRandomColor(): string {
    return '#' + Math.floor(Math.random()*16777215).toString(16)
  }

  private setLocalAwareness() {
    const state: UserAwareness = {
      id: this.clientId,
      name: Math.random().toString(36).substring(2, 15),
      color: this.userColor,
    }
    this.provider.awareness!.setLocalState(state)
  }

  private bindEvents() {
    this.graph.on('node:added', ({ node }) => this.updateNode(node))
    this.graph.on('node:removed', ({ node }) => this.removeNode(node))
    this.graph.on('node:changed', ({ node }) => this.updateNode(node))
    this.graph.on('edge:added', ({ edge }) => this.updateEdge(edge))
    this.graph.on('edge:removed', ({ edge }) => this.removeEdge(edge))
    this.graph.on('edge:changed', ({ edge }) => this.updateEdge(edge))

    this.nodesMap.observe(event => {
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const nodeData = this.nodesMap.get(key)
          this.updateGraphNode(key, nodeData)
        } else if (change.action === 'delete') {
          this.graph.removeCell(key)
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
    this.graph.getNodes().forEach(node => this.updateNode(node))
    this.graph.getEdges().forEach(edge => this.updateEdge(edge))
  }

  private updateNode(node: Node) {
    this.nodesMap.set(node.id, node.toJSON())
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

  setNodeOperator(nodeId: string) {
    const node = this.graph.getCellById(nodeId) as Node
    if (node) {
      node.setData({ ...node.getData(), operatorId: this.clientId })
      this.updateNode(node)
    }
  }

  clearNodeOperator(nodeId: string) {
    const node = this.graph.getCellById(nodeId) as Node
    if (node) {
      const data = node.getData()
      data.operatorId = null
      node.setData(data)
      this.updateNode(node)
    }
  }

  canOperateNode(nodeId: string): boolean {
    const node = this.graph.getCellById(nodeId) as Node
    if (!node) return false
    const data = node.getData() || {}
    return !data.operatorId || data.operatorId === this.clientId
  }

  canOperate(cell: Node | Edge): boolean {
    const data = cell.getData() || {};
    return !data.operatorId || data.operatorId === this.clientId;
  }
}