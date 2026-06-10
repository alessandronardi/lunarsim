import type { HexCell, PlacedStructure } from '../types/game';

/** Direzioni esagonali (coordinate cubiche q,r) */
const NEIGHBOR_OFFSETS: [number, number][] = [
    [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1],
];

export function parseHexId(hexId: string): { q: number; r: number } {
    const [q, r] = hexId.split(',').map(Number);
    return { q, r };
}

export function neighborHexIds(q: number, r: number): string[] {
    return NEIGHBOR_OFFSETS.map(([dq, dr]) => `${q + dq},${r + dr}`);
}

export function isHexOccupied(
    hexId: string,
    placed: Record<string, PlacedStructure>,
): boolean {
    return Object.values(placed).some(
        ps => ps.hexId === hexId || ps.secondaryHexId === hexId,
    );
}

/**
 * Trova un hex libero adiacente per strutture gridSize 2.
 * @param secondaryMustBeAccessible se false (es. STR-B03), l'hex secondario può essere fuori segnale
 */
export function findSecondaryHexId(
    grid: HexCell[],
    primaryHexId: string,
    placed: Record<string, PlacedStructure>,
    secondaryMustBeAccessible: boolean,
): string | null {
    const { q, r } = parseHexId(primaryHexId);
    for (const nid of neighborHexIds(q, r)) {
        const cell = grid.find(c => c.id === nid);
        if (!cell || cell.building_id) continue;
        if (isHexOccupied(nid, placed)) continue;
        if (secondaryMustBeAccessible && !cell.is_accessible) continue;
        return nid;
    }
    return null;
}

/** Hex protetti da STR-E03: cella dello scudo + tutti i vicini */
export function shieldProtectedHexIds(
    placed: Record<string, PlacedStructure>,
): Set<string> {
    const covered = new Set<string>();
    for (const ps of Object.values(placed)) {
        if (ps.definitionId !== 'STR-E03' || ps.inStandby || ps.building || ps.health <= 0) continue;
        covered.add(ps.hexId);
        if (ps.secondaryHexId) covered.add(ps.secondaryHexId);
        const { q, r } = parseHexId(ps.hexId);
        for (const nid of neighborHexIds(q, r)) covered.add(nid);
    }
    return covered;
}

/** True se almeno un hex occupato dalla struttura è sotto scudo E03 */
export function isStructureShieldProtected(
    ps: PlacedStructure,
    covered: Set<string>,
): boolean {
    if (covered.has(ps.hexId)) return true;
    if (ps.secondaryHexId && covered.has(ps.secondaryHexId)) return true;
    return false;
}
