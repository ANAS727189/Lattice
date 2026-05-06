# Collaborative Systems

This is a comprehensive technical guide documenting the transition from high-level real-time collaboration to the low-level mathematical implementation of **RGA (Replicated Growable Array)**.

## 1. The Core Problem: The Distributed Consensus
In a single-user application, the "state" is absolute. In a collaborative application, the state is **fragmented**. If two users edit the same piece of data at the same time, how do we ensure they don't end up with different versions of the truth?

### The Comparison: OT vs. CRDT
Historically, there are two ways to solve this:

#### **Operational Transformation (OT)**
* **The Logic:** Instead of syncing the *data*, you sync the *operation* (e.g., "Insert 'X' at index 5").
* **The Problem:** If User A deletes index 4 while User B inserts at index 5, the "index 5" is now wrong. The server must "transform" the operation to "Insert at index 4."
* **The Flaw:** It is **Stateful**. It requires a central server to sequence every single edit. It fails in peer-to-peer or complex offline-first scenarios.

#### **Conflict-free Replicated Data Types (CRDT)**
* **The Logic:** Data is structured so that conflicts are mathematically impossible. It is **Stateless**.
* **The Benefit:** It doesn't matter what order you receive the updates; the final result is always the same. This is known as **Strong Eventual Consistency**.

---

## 2. Understanding RGA (Replicated Growable Array)
RGA is the "Gold Standard" CRDT for text editors. While libraries like **Yjs** use highly optimized versions (like YATA), RGA is the most intuitive implementation for a developer to build from scratch.

### The Three Pillars of RGA
1.  **Immutable Identity:** Every character (Node) is assigned a unique ID `(Timestamp, UserID)` that never changes.
2.  **Causal Linking:** Every character stores the ID of the character that was to its left when it was typed (the `ParentID`).
3.  **Tombstones:** To "delete" text, we don't remove the node; we just mark it as `IsDeleted = true`. This preserves the structure so other nodes can still link to it.

---

## 3. The Mathematics of Time: Lamport Clocks
In RGA, we cannot use "Real Time" (Wall Clock) because computer clocks are never perfectly synced. Instead, we use **Logical Time**.

* **The Counter:** Each user maintains an integer.
* **The Increment:** Every time you type, your counter goes up.
* **The Sync:** When you receive a message with a higher counter than yours, you "jump" your counter to that value + 1.

> **Tie-breaking:** If two users have the same Timestamp, we compare their `UserID` strings (e.g., "User_Z" > "User_A"). This ensures a deterministic winner every time.

---

## 4. Use Case Comparison: The "Concurrent Edit"
**Scenario:** A document contains the letter **"A"**. Three users try to insert a letter after **"A"** simultaneously.

| User | Action | ID (Time, User) | Resulting Intent |
| :--- | :--- | :--- | :--- |
| **User 1** | Insert "C" after "A" | `(10, "U1")` | `A -> C` |
| **User 2** | Insert "B" after "A" | `(5, "U2")` | `A -> B` |
| **User 3** | Insert "D" after "A" | `(15, "U3")` | `A -> D` |

### How each system handles this:

#### **1. The "Dumb" System (Last Write Wins)**
The server receives User 3 last. It overwrites everything.
* **Final State:** `AD` (User 1 and 2 lose their work).

#### **2. Operational Transformation (OT)**
The server receives "C", then "B", then "D". It transforms the indexes.
* **Final State:** `ACBD` (Order depends entirely on which packet reached the server first).

#### **3. RGA (Your Implementation)**
The system treats B, C, and D as "siblings" of A and sorts them by ID descending.
1.  **D** (15) > **C** (10) > **B** (5).
2.  **Final State:** `ADCB`.
3.  **The Miracle:** It doesn't matter if you receive D first, B first, or C first. Once all three packets arrive, every computer on earth will show `ADCB`.



---

## 5. Implementation Architecture (Go)

### The Data Structures
The core of the sandbox is built on these two structures:

```go
type ID struct {
    Timestamp int
    UserId    string
}

type Node struct {
    Data      string
    Id        ID
    ParentID  ID
    IsDeleted bool
    Next      *Node
}
```

### The "Integrate" Algorithm
The logic for inserting a node follows a strict path to ensure consistency:
1.  **Find the Parent:** Traverse the list to find the node matching `ParentID`.
2.  **Handle Siblings:** If the `Parent.Next` node exists and was also born from the same `ParentID`, compare IDs.
3.  **The Skip:** If the existing next node has a **Greater ID** than our new node, move to the next one and repeat.
4.  **Insert:** Place the new node once you find a node with a smaller ID or a different parent path.



---

## 6. Summary of the Workflow
1.  **Local Edit:** User types $\rightarrow$ increment Lamport Clock $\rightarrow$ create Node $\rightarrow$ locally `Integrate`.
2.  **Broadcast:** Send the Node (ID, ParentID, Data) over WebSockets.
3.  **Remote Merge:** Other clients receive the Node $\rightarrow$ run the same `Integrate` logic $\rightarrow$ UI updates.
4.  **Persistence:** Periodically save the linked-list state to PostgreSQL as a binary blob.

**This architecture is the foundation of modern collaborative software (Figma, Google Docs, LucidChart).**
