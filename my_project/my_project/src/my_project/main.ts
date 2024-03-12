import { Principal } from "@dfinity/principal";
import { context, storage } from "ic0";

// Define types
type AuctionId = bigint;
type Bid = { bidder: Principal; amount: bigint };
type AuctionStatus = "Open" | "Closed";

// Define Auction structure
interface Auction {
    seller: Principal;
    item: string;
    minimumBid: bigint;
    bids: Bid[];
    status: AuctionStatus;
}

// Function to create a new auction
export function createAuction(item: string, minimumBid: bigint): AuctionId {
    const auctionId = storage.get<AuctionId>("auctionId") || 0n;
    const auction: Auction = {
        seller: context.caller,
        item,
        minimumBid,
        bids: [],
        status: "Open",
    };
    storage.set(auctionId, auction);
    storage.set("auctionId", auctionId + 1n);
    return auctionId;
}

// Function to place a bid on an auction
export function placeBid(auctionId: AuctionId, amount: bigint): void {
    const auction = storage.get<Auction>(auctionId);
    if (!auction) {
        throw new Error("Auction does not exist");
    }
    if (auction.status !== "Open") {
        throw new Error("Auction is closed");
    }
    if (amount <= auction.minimumBid) {
        throw new Error("Bid amount must be higher than the current highest bid");
    }
    const bidder = context.caller;
    const updatedAuction: Auction = {
        ...auction,
        bids: [...auction.bids, { bidder, amount }],
    };
    storage.set(auctionId, updatedAuction);
}

// Function to close an auction and determine the winner
export function closeAuction(auctionId: AuctionId): Principal | null {
    const auction = storage.get<Auction>(auctionId);
    if (!auction) {
        throw new Error("Auction does not exist");
    }
    if (auction.status !== "Open") {
        throw new Error("Auction is already closed");
    }
    auction.status = "Closed";
    let winner: Principal | null = null;
    let highestBid: bigint = 0n;
    for (const bid of auction.bids) {
        if (bid.amount > highestBid) {
            highestBid = bid.amount;
            winner = bid.bidder;
        }
    }
    return winner;
}

// Function to cancel an auction
export function cancelAuction(auctionId: AuctionId): void {
    const auction = storage.get<Auction>(auctionId);
    if (!auction) {
        throw new Error("Auction does not exist");
    }
    if (auction.status !== "Open") {
        throw new Error("Cannot cancel a closed auction");
    }
    if (context.caller !== auction.seller) {
        throw new Error("Only the seller can cancel the auction");
    }
    auction.status = "Closed";
    storage.set(auctionId, auction);
}
