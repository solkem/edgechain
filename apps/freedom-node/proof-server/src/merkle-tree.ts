/**
 * Merkle Tree - Binary Hash Tree for Device Commitments
 * 
 * 20-level tree supporting up to 2^20 = 1,048,576 devices
 * Uses SHA-256 for hashing
 */

import { createHash } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { logger } from './utils/logger';

export interface MerkleProof {
    siblings: string[];
    pathBits: boolean[];
    root: string;
    leafIndex: number;
}

export class MerkleTree {
    private depth: number;
    private leaves: string[] = [];
    private tree: string[][] = [];
    private leafIndexMap: Map<string, number> = new Map();

    // Precomputed zero hashes for empty subtrees
    private zeroHashes: string[];

    constructor(depth: number = 20) {
        this.depth = depth;
        this.zeroHashes = this.computeZeroHashes();
        this.initializeTree();
    }

    /**
     * Compute zero hashes for each level
     * zeroHash[0] = H(0), zeroHash[i] = H(zeroHash[i-1] || zeroHash[i-1])
     */
    private computeZeroHashes(): string[] {
        const zeros: string[] = [];

        // Level 0: empty leaf
        zeros[0] = '0'.repeat(64);

        // Each subsequent level
        for (let i = 1; i <= this.depth; i++) {
            zeros[i] = this.hashPair(zeros[i - 1], zeros[i - 1]);
        }

        return zeros;
    }

    /**
     * Initialize empty tree structure
     */
    private initializeTree(): void {
        this.tree = [];

        for (let i = 0; i <= this.depth; i++) {
            this.tree[i] = [];
        }

        // Root is at depth 0, leaves are at this.depth
        this.tree[0][0] = this.zeroHashes[this.depth];
    }

    /**
     * Hash two nodes together
     */
    private hashPair(left: string, right: string): string {
        const hash = createHash('sha256');
        hash.update(Buffer.from(left, 'hex'));
        hash.update(Buffer.from(right, 'hex'));
        return hash.digest('hex');
    }

    /**
     * Insert a new leaf (commitment) into the tree
     */
    insert(commitment: string): number {
        const leafIndex = this.leaves.length;

        if (leafIndex >= Math.pow(2, this.depth)) {
            throw new Error(`Tree is full (max ${Math.pow(2, this.depth)} leaves)`);
        }

        // Add to leaves array
        this.leaves.push(commitment);
        this.leafIndexMap.set(commitment, leafIndex);

        // Update tree from leaf to root
        this.updatePath(leafIndex, commitment);

        return leafIndex;
    }

    /**
     * Update the path from a leaf to the root
     */
    private updatePath(leafIndex: number, value: string): void {
        let currentIndex = leafIndex;
        let currentValue = value;

        // Start from leaves (bottom) and go up to root
        for (let level = this.depth; level >= 0; level--) {
            this.tree[level][currentIndex] = currentValue;

            if (level === 0) break;

            // Get sibling
            const siblingIndex = currentIndex ^ 1; // XOR with 1 to get sibling
            const sibling = this.tree[level][siblingIndex] || this.zeroHashes[this.depth - level];

            // Compute parent
            const isLeftChild = currentIndex % 2 === 0;
            currentValue = isLeftChild
                ? this.hashPair(currentValue, sibling)
                : this.hashPair(sibling, currentValue);

            // Move up
            currentIndex = Math.floor(currentIndex / 2);
        }
    }

    /**
     * Get the current root hash
     */
    getRoot(): string {
        return this.tree[0][0] || this.zeroHashes[this.depth];
    }

    /**
     * Get the number of leaves (registered commitments)
     */
    getLeafCount(): number {
        return this.leaves.length;
    }

    /**
     * Check if a commitment exists in the tree
     */
    hasLeaf(commitment: string): boolean {
        return this.leafIndexMap.has(commitment);
    }

    /**
     * Get the index of a commitment
     */
    getLeafIndex(commitment: string): number | undefined {
        return this.leafIndexMap.get(commitment);
    }

    /**
     * Generate a Merkle proof for a commitment
     */
    getProof(commitment: string): MerkleProof | null {
        const leafIndex = this.leafIndexMap.get(commitment);

        if (leafIndex === undefined) {
            return null;
        }

        const siblings: string[] = [];
        const pathBits: boolean[] = [];

        let currentIndex = leafIndex;

        for (let level = this.depth; level > 0; level--) {
            const siblingIndex = currentIndex ^ 1;
            const sibling = this.tree[level][siblingIndex] || this.zeroHashes[this.depth - level];

            siblings.push(sibling);
            pathBits.push(currentIndex % 2 === 1); // true if current is right child

            currentIndex = Math.floor(currentIndex / 2);
        }

        return {
            siblings,
            pathBits,
            root: this.getRoot(),
            leafIndex
        };
    }

    /**
     * Verify a Merkle proof
     */
    verifyProof(commitment: string, proof: MerkleProof): boolean {
        if (proof.siblings.length !== this.depth) {
            return false;
        }

        let current = commitment;

        for (let i = 0; i < this.depth; i++) {
            const sibling = proof.siblings[i];
            const isRightChild = proof.pathBits[i];

            current = isRightChild
                ? this.hashPair(sibling, current)
                : this.hashPair(current, sibling);
        }

        return current === proof.root;
    }

    /**
     * Save tree state to file
     */
    async save(path: string): Promise<void> {
        try {
            await mkdir(dirname(path), { recursive: true });

            const state = {
                depth: this.depth,
                leaves: this.leaves,
                savedAt: Date.now()
            };

            await writeFile(path, JSON.stringify(state, null, 2));
            logger.info(`Merkle tree saved to ${path} (${this.leaves.length} leaves)`);

        } catch (error) {
            logger.error('Failed to save Merkle tree:', error);
            throw error;
        }
    }

    /**
     * Load tree state from file
     */
    async load(path: string): Promise<void> {
        try {
            const data = await readFile(path, 'utf-8');
            const state = JSON.parse(data);

            if (state.depth !== this.depth) {
                throw new Error(`Depth mismatch: expected ${this.depth}, got ${state.depth}`);
            }

            // Rebuild tree from leaves
            this.initializeTree();
            this.leaves = [];
            this.leafIndexMap.clear();

            for (const leaf of state.leaves) {
                this.insert(leaf);
            }

            logger.info(`Merkle tree loaded from ${path} (${this.leaves.length} leaves)`);

        } catch (error: any) {
            if (error.code === 'ENOENT') {
                logger.info('No existing Merkle tree found, starting fresh');
            } else {
                logger.error('Failed to load Merkle tree:', error);
                throw error;
            }
        }
    }

    /**
     * Get all leaves (for debugging)
     */
    getAllLeaves(): string[] {
        return [...this.leaves];
    }
}
