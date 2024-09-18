import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { Graph, Node, Edge, Cell } from '@antv/x6'

export class Collaboration {
  private doc: Y.Doc
  private provider: WebsocketProvider
  private graph: Graph
  private nodesMap: Y.Map<any>
  private edgesMap: Y.Map<any>

  constructor(graph: Graph, room: string) {
    this.graph = graph
    this.doc = new Y.Doc()
    this.provider = new WebsocketProvider('ws://localhost:1234', room, this.doc)
    this.nodesMap = this.doc.getMap('nodes')
    this.edgesMap = this.doc.getMap('edges')

    this.bindEvents()
    this.syncInitialState()
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
}