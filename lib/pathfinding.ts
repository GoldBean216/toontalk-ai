interface Point {
  x: number;
  y: number;
}

interface Node extends Point {
  id: string;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

export const findClosestRoadNode = (x: number, y: number, roadGrid: Record<string, {x: number, y: number}>): Point | null => {
  let closest: Point | null = null;
  let minD = Infinity;
  for (const key in roadGrid) {
    const node = roadGrid[key];
    const dx = node.x - x;
    const dy = node.y - y;
    const d = dx*dx + dy*dy;
    if (d < minD) {
      minD = d;
      closest = { x: node.x, y: node.y };
    }
  }
  return closest;
};

export const aStarPathfind = (
  startNode: Point, 
  endNode: Point, 
  roadGrid: Record<string, {x: number, y: number}>
): Point[] => {
  const openSet: Map<string, Node> = new Map();
  const closedSet: Set<string> = new Set();
  
  const startId = `${startNode.x},${startNode.y}`;
  const endId = `${endNode.x},${endNode.y}`;
  
  const heuristic = (p1: Point, p2: Point) => Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
  
  const startRecord: Node = {
    x: startNode.x,
    y: startNode.y,
    id: startId,
    g: 0,
    h: heuristic(startNode, endNode),
    f: heuristic(startNode, endNode),
    parent: null
  };
  
  openSet.set(startId, startRecord);
  
  while (openSet.size > 0) {
    // Find node with lowest f
    let current: Node | null = null;
    for (const node of openSet.values()) {
      if (!current || node.f < current.f) {
        current = node;
      }
    }
    
    if (!current) break;
    
    if (current.id === endId) {
      // Reconstruct path
      const path: Point[] = [];
      let curr: Node | null = current;
      while (curr) {
        path.push({ x: curr.x, y: curr.y });
        curr = curr.parent;
      }
      return path.reverse();
    }
    
    openSet.delete(current.id);
    closedSet.add(current.id);
    
    // Check neighbors
    const neighbors: Point[] = [
      { x: current.x + 40, y: current.y },
      { x: current.x - 40, y: current.y },
      { x: current.x, y: current.y + 40 },
      { x: current.x, y: current.y - 40 }
    ];
    
    for (const neighbor of neighbors) {
      const neighborId = `${neighbor.x},${neighbor.y}`;
      
      // Must be on roadGrid unless it's the exact end node (which it is, since endNode is from closestRoadNode)
      if (!roadGrid[neighborId]) continue;
      if (closedSet.has(neighborId)) continue;
      
      const tentativeG = current.g + 40;
      
      let neighborNode = openSet.get(neighborId);
      if (!neighborNode) {
        neighborNode = {
          x: neighbor.x,
          y: neighbor.y,
          id: neighborId,
          g: tentativeG,
          h: heuristic(neighbor, endNode),
          f: tentativeG + heuristic(neighbor, endNode),
          parent: current
        };
        openSet.set(neighborId, neighborNode);
      } else if (tentativeG < neighborNode.g) {
        neighborNode.parent = current;
        neighborNode.g = tentativeG;
        neighborNode.f = neighborNode.g + neighborNode.h;
      }
    }
  }
  
  // If no path found on roads, return straight line as fallback
  return [startNode, endNode];
};
