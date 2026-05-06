package main

type ID struct {
	Timestamp int
	UserId    string // Unique string for eg :- "user-parent-123"
}

type Node struct {
	Data      string
	Id        ID
	ParentID  ID
	IsDeleted bool
	Next      *Node
}

type RGADocument struct {
	Head        *Node
	CurrentTime int
	MyUserID    string
}

func create_Node(data string, id ID, parentID ID) *Node {
	return &Node{
		Data:      data,
		Id:        id,
		ParentID:  parentID,
		IsDeleted: false,
		Next:      nil,
	}
}

func isGreaterId(id1 ID, id2 ID) bool {
	if id1.Timestamp > id2.Timestamp {
		return true
	}

	if id1.Timestamp == id2.Timestamp {
		return id1.UserId > id2.UserId
	}

	return false
}

// Command will come as:
// Insert 'B' after 'A' by user 'user-parent-123' at timestamp 123
func insert_Node(head *Node, data string, id ID, parentID ID) *Node {
	newNode := create_Node(data, id, parentID)

	if head == nil {
		return newNode
	}

	curr := head
	for curr != nil && curr.Id != parentID {
		curr = curr.Next
	}

	if curr == nil && parentID.Timestamp != 0 {
		return head
	}

	// Special case for inserting at root
	if curr == nil {
		newNode.Next = head
		return newNode
	}

	dest := curr

	for dest.Next != nil {
		if dest.Next.ParentID == parentID {
			if isGreaterId(dest.Next.Id, newNode.Id) {
				dest = dest.Next
				continue
			}
		}
		break
	}

	newNode.Next = dest.Next
	dest.Next = newNode

	return head
}

func (doc *RGADocument) LocalInsert(afterID ID, data string) ID {
	doc.CurrentTime++

	newID := ID{
		Timestamp: doc.CurrentTime,
		UserId:    doc.MyUserID,
	}

	doc.Head = insert_Node(doc.Head, data, newID, afterID)

	return newID
}

func printList(head *Node) {
	curr := head

	for curr != nil {
		if !curr.IsDeleted {
			println(curr.Data)
		}

		curr = curr.Next
	}
}

func delete_Node(head *Node, id ID) {
	curr := head

	for curr != nil {
		if curr.Id == id {
			curr.IsDeleted = true
			return
		}

		curr = curr.Next
	}
}

func main() {
	// doc := RGADocument{
	// 	Head:        nil,
	// 	CurrentTime: 0,
	// 	MyUserID:    "user1-parent-123",
	// }

	// aID := doc.LocalInsert(ID{}, "A")

	// doc.LocalInsert(aID, "B")
	// doc.LocalInsert(aID, "C")
	// doc.LocalInsert(aID, "D")

	// printList(doc.Head)

	// delete_Node(doc.Head, aID)

	// println("After deletion:")

	// printList(doc.Head)

	// 1. User 1 creates 'A'
	doc1 := RGADocument{MyUserID: "User1", CurrentTime: 0}
	aID := doc1.LocalInsert(ID{}, "A")

	// 2. User 1 inserts 'C' (Timestamp 2)
	cID := ID{Timestamp: 2, UserId: "User1"}
	doc1.Head = insert_Node(doc1.Head, "C", cID, aID)

	// 3. User 2 inserts 'B' (Timestamp 1)
	// Simulating that User 2 received 'A' but hasn't seen 'C' yet
	bID := ID{Timestamp: 1, UserId: "User2"}
	doc2 := RGADocument{Head: create_Node("A", aID, ID{}), MyUserID: "User2"}
	doc2.Head = insert_Node(doc2.Head, "B", bID, aID)

	// 4. THE SYNC: Send B to User 1, and C to User 2
	doc1.Head = insert_Node(doc1.Head, "B", bID, aID)
	doc2.Head = insert_Node(doc2.Head, "C", cID, aID)

	println("User 1 result:")
	printList(doc1.Head) // Should be A, C, B

	println("User 2 result:")
	printList(doc2.Head) // Should be A, C, B
	
}