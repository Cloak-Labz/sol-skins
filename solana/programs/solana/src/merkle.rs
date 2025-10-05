use crate::constants::MAX_MERKLE_PROOF_DEPTH;
use crate::errors::SkinVaultError;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;

/// Verify a Merkle proof for an inventory item
pub fn verify_merkle_proof(leaf: &[u8; 32], root: &[u8; 32], proof: &Vec<[u8; 32]>) -> Result<()> {
    // Check proof depth
    require!(
        proof.len() <= MAX_MERKLE_PROOF_DEPTH,
        SkinVaultError::MerkleProofTooDeep
    );

    let mut computed_hash = *leaf;

    for proof_element in proof.iter() {
        // Determine order: smaller hash goes first (standard practice)
        let (left, right) = if computed_hash <= *proof_element {
            (computed_hash, *proof_element)
        } else {
            (*proof_element, computed_hash)
        };

        // Hash the concatenated pair
        let mut data = Vec::with_capacity(64);
        data.extend_from_slice(&left);
        data.extend_from_slice(&right);
        computed_hash = keccak::hash(&data).0;
    }

    require!(computed_hash == *root, SkinVaultError::InvalidMerkleProof);

    Ok(())
}

/// Create a leaf hash for an inventory item
pub fn create_inventory_leaf(inventory_id: &str, metadata: &str) -> [u8; 32] {
    let mut data = Vec::new();
    data.extend_from_slice(inventory_id.as_bytes());
    data.extend_from_slice(b"|"); // separator
    data.extend_from_slice(metadata.as_bytes());
    keccak::hash(&data).0
}

/// Create a simple merkle tree from a list of leaves
pub fn build_merkle_tree(leaves: Vec<[u8; 32]>) -> Result<[u8; 32]> {
    require!(!leaves.is_empty(), SkinVaultError::InvalidBatchId);

    if leaves.len() == 1 {
        return Ok(leaves[0]);
    }

    let mut current_level = leaves;

    while current_level.len() > 1 {
        let mut next_level = Vec::new();

        // Process pairs
        for chunk in current_level.chunks(2) {
            let left = chunk[0];
            let right = if chunk.len() == 2 {
                chunk[1]
            } else {
                // Odd number of nodes - duplicate the last one
                chunk[0]
            };

            let (a, b) = if left <= right {
                (left, right)
            } else {
                (right, left)
            };

            let mut data = Vec::with_capacity(64);
            data.extend_from_slice(&a);
            data.extend_from_slice(&b);
            let parent = keccak::hash(&data).0;

            next_level.push(parent);
        }

        current_level = next_level;
    }

    Ok(current_level[0])
}

/// Generate a Merkle proof for a specific leaf in a tree
pub fn generate_merkle_proof(
    leaves: &Vec<[u8; 32]>,
    target_leaf: &[u8; 32],
) -> Result<Vec<[u8; 32]>> {
    let target_index = leaves
        .iter()
        .position(|leaf| leaf == target_leaf)
        .ok_or(SkinVaultError::InvalidMerkleProof)?;

    let mut proof = Vec::new();
    let mut current_level = leaves.clone();
    let mut index = target_index;

    while current_level.len() > 1 {
        let mut next_level = Vec::new();

        // Find sibling
        let sibling_index = if index % 2 == 0 {
            // Even index - sibling is to the right
            if index + 1 < current_level.len() {
                index + 1
            } else {
                index // No sibling, use self
            }
        } else {
            // Odd index - sibling is to the left
            index - 1
        };

        if sibling_index != index {
            proof.push(current_level[sibling_index]);
        }

        // Build next level
        for chunk in current_level.chunks(2) {
            let left = chunk[0];
            let right = if chunk.len() == 2 { chunk[1] } else { chunk[0] };

            let (a, b) = if left <= right {
                (left, right)
            } else {
                (right, left)
            };

            let mut data = Vec::with_capacity(64);
            data.extend_from_slice(&a);
            data.extend_from_slice(&b);
            let parent = keccak::hash(&data).0;

            next_level.push(parent);
        }

        current_level = next_level;
        index = index / 2;
    }

    Ok(proof)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_single_leaf_tree() {
        let leaf = [1u8; 32];
        let leaves = vec![leaf];
        let root = build_merkle_tree(leaves).unwrap();
        assert_eq!(root, leaf);
    }

    #[test]
    fn test_two_leaf_tree() {
        let leaf1 = [1u8; 32];
        let leaf2 = [2u8; 32];
        let leaves = vec![leaf1, leaf2];

        let root = build_merkle_tree(leaves.clone()).unwrap();

        // Generate and verify proof for leaf1
        let proof = generate_merkle_proof(&leaves, &leaf1).unwrap();
        assert!(verify_merkle_proof(&leaf1, &root, &proof).is_ok());

        // Generate and verify proof for leaf2
        let proof = generate_merkle_proof(&leaves, &leaf2).unwrap();
        assert!(verify_merkle_proof(&leaf2, &root, &proof).is_ok());
    }

    #[test]
    fn test_four_leaf_tree() {
        let leaves = vec![[1u8; 32], [2u8; 32], [3u8; 32], [4u8; 32]];
        let root = build_merkle_tree(leaves.clone()).unwrap();

        // Test proof for each leaf
        for leaf in &leaves {
            let proof = generate_merkle_proof(&leaves, leaf).unwrap();
            assert!(verify_merkle_proof(leaf, &root, &proof).is_ok());
        }
    }

    #[test]
    fn test_invalid_proof_fails() {
        let leaves = vec![[1u8; 32], [2u8; 32]];
        let root = build_merkle_tree(leaves).unwrap();

        let invalid_leaf = [99u8; 32];
        let invalid_proof = vec![[42u8; 32]];

        assert!(verify_merkle_proof(&invalid_leaf, &root, &invalid_proof).is_err());
    }

    #[test]
    fn test_inventory_leaf_creation() {
        let leaf1 = create_inventory_leaf("item1", "metadata1");
        let leaf2 = create_inventory_leaf("item2", "metadata2");
        assert_ne!(leaf1, leaf2);

        // Same input should produce same hash
        let leaf1_dup = create_inventory_leaf("item1", "metadata1");
        assert_eq!(leaf1, leaf1_dup);
    }
}
