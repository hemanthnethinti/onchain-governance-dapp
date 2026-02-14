"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect, usePublicClient, useWalletClient } from "wagmi";
import { parseAbiItem } from "viem";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { governorAbi } from "../lib/abis";
import { shortAddress, statusLabel } from "../lib/format";

const zeroAddress = "0x0000000000000000000000000000000000000000";

export default function Home() {
  const governorAddress = process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS || zeroAddress;
  const deployBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK || "0");

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txMessage, setTxMessage] = useState("");
  const [currentBlock, setCurrentBlock] = useState(0n);

  const [description, setDescription] = useState("");
  const [votingType, setVotingType] = useState("0");
  const [quadraticVotes, setQuadraticVotes] = useState({});

  const canRead = useMemo(() => publicClient && governorAddress !== zeroAddress, [publicClient, governorAddress]);

  const refreshProposals = async () => {
    if (!canRead) {
      setError("Set NEXT_PUBLIC_GOVERNOR_ADDRESS in your .env file.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [logs, latestBlock] = await Promise.all([
        publicClient.getLogs({
          address: governorAddress,
          event: parseAbiItem(
            "event ProposalCreated(uint256 proposalId,address proposer,address[] targets,uint256[] values,bytes[] calldatas,uint256 startBlock,uint256 endBlock,string description)"
          ),
          fromBlock: deployBlock,
          toBlock: "latest"
        }),
        publicClient.getBlockNumber()
      ]);

      setCurrentBlock(latestBlock);

      const items = await Promise.all(
        logs.map(async (log) => {
          const proposalId = log.args.proposalId;
          const [state, votes, deadline, snapshot, type] = await Promise.all([
            publicClient.readContract({
              address: governorAddress,
              abi: governorAbi,
              functionName: "state",
              args: [proposalId]
            }),
            publicClient.readContract({
              address: governorAddress,
              abi: governorAbi,
              functionName: "proposalVotes",
              args: [proposalId]
            }),
            publicClient.readContract({
              address: governorAddress,
              abi: governorAbi,
              functionName: "proposalDeadline",
              args: [proposalId]
            }),
            publicClient.readContract({
              address: governorAddress,
              abi: governorAbi,
              functionName: "proposalSnapshot",
              args: [proposalId]
            }),
            publicClient.readContract({
              address: governorAddress,
              abi: governorAbi,
              functionName: "proposalVotingType",
              args: [proposalId]
            })
          ]);

          return {
            id: proposalId,
            description: log.args.description,
            proposer: log.args.proposer,
            state,
            votes,
            deadline,
            snapshot,
            votingType: type,
            startBlock: log.args.startBlock,
            endBlock: log.args.endBlock
          };
        })
      );

      items.sort((a, b) => (a.id > b.id ? -1 : 1));
      setProposals(items);
    } catch (fetchError) {
      setError(fetchError?.shortMessage || fetchError?.message || "Failed to fetch proposals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProposals();
  }, [canRead]);

  const handleConnect = () => {
    if (!connectors.length) return;
    connect({ connector: connectors[0] });
  };

  const handleVote = async (proposalId, support) => {
    if (!walletClient) {
      setTxMessage("Connect a wallet first.");
      return;
    }

    setTxMessage("Submitting vote...");
    try {
      await walletClient.writeContract({
        address: governorAddress,
        abi: governorAbi,
        functionName: "castVote",
        args: [proposalId, support]
      });
      setTxMessage("Vote submitted.");
      await refreshProposals();
    } catch (voteError) {
      setTxMessage(voteError?.shortMessage || voteError?.message || "Vote failed.");
    }
  };

  const handleQuadraticVote = async (proposalId, support) => {
    if (!walletClient) {
      setTxMessage("Connect a wallet first.");
      return;
    }

    const votes = Number(quadraticVotes[proposalId] || 1);
    if (!votes || votes < 1) {
      setTxMessage("Enter a valid quadratic vote amount.");
      return;
    }

    setTxMessage("Submitting quadratic vote...");
    try {
      await walletClient.writeContract({
        address: governorAddress,
        abi: governorAbi,
        functionName: "castQuadraticVote",
        args: [proposalId, support, BigInt(votes)]
      });
      setTxMessage("Quadratic vote submitted.");
      await refreshProposals();
    } catch (voteError) {
      setTxMessage(voteError?.shortMessage || voteError?.message || "Vote failed.");
    }
  };

  const handlePropose = async (event) => {
    event.preventDefault();
    if (!walletClient) {
      setTxMessage("Connect a wallet first.");
      return;
    }
    if (!description.trim()) {
      setTxMessage("Add a proposal description.");
      return;
    }

    setTxMessage("Submitting proposal...");
    try {
      const functionName = votingType === "1" ? "proposeWithType" : "propose";
      const args =
        votingType === "1"
          ? [[], [], [], description.trim(), 1]
          : [[], [], [], description.trim()];

      await walletClient.writeContract({
        address: governorAddress,
        abi: governorAbi,
        functionName,
        args
      });
      setDescription("");
      setTxMessage("Proposal submitted.");
      await refreshProposals();
    } catch (proposalError) {
      setTxMessage(proposalError?.shortMessage || proposalError?.message || "Proposal failed.");
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-16">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-slate uppercase tracking-[0.3em] text-xs">Governance Control Room</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-2">On-Chain Voting Console</h1>
          <p className="text-slate mt-3 max-w-xl">
            Track proposals, vote with standard or quadratic weight, and execute community-driven
            decisions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            data-testid="connect-wallet-button"
            onClick={isConnected ? () => disconnect() : handleConnect}
            className={`px-4 py-2 rounded-full font-semibold ${
              isConnected ? "bg-rose text-white" : "bg-mint text-ink"
            }`}
          >
            {isConnected ? "Connected" : "Connect Wallet"}
          </button>
          {isConnected && (
            <span
              data-testid="user-address"
              className="data-pill px-3 py-2 rounded-full text-sm font-mono text-slate"
            >
              {shortAddress(address)}
            </span>
          )}
        </div>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="proposal-card rounded-3xl p-6">
          <h2 className="text-2xl font-semibold">Create Proposal</h2>
          <form onSubmit={handlePropose} className="mt-5 grid gap-4">
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description of the proposal"
              className="w-full rounded-2xl bg-slate/10 border border-slate/40 px-4 py-3"
            />
            <div className="flex flex-wrap gap-3">
              <select
                value={votingType}
                onChange={(event) => setVotingType(event.target.value)}
                className="rounded-2xl bg-slate/10 border border-slate/40 px-4 py-3"
              >
                <option value="0">Standard voting</option>
                <option value="1">Quadratic voting</option>
              </select>
              <button
                type="submit"
                className="px-5 py-3 rounded-2xl bg-sun text-ink font-semibold"
              >
                Submit Proposal
              </button>
            </div>
          </form>
          {txMessage && <p className="mt-4 text-slate">{txMessage}</p>}
        </div>

        <div className="proposal-card rounded-3xl p-6">
          <h2 className="text-2xl font-semibold">Network Status</h2>
          <div className="mt-4 grid gap-3 text-slate">
            <p>Governor: <span className="font-mono text-white">{shortAddress(governorAddress)}</span></p>
            <p>Deploy block: <span className="font-mono text-white">{deployBlock.toString()}</span></p>
            <p>Proposals loaded: <span className="font-mono text-white">{proposals.length}</span></p>
          </div>
          {error && <p className="mt-4 text-rose">{error}</p>}
          {loading && <p className="mt-4 text-slate">Syncing proposals...</p>}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Proposals</h2>
          <button
            onClick={refreshProposals}
            className="px-4 py-2 rounded-full border border-slate/50 text-slate"
          >
            Refresh
          </button>
        </div>

        <ul className="mt-6 grid gap-6">
          {proposals.map((proposal) => {
            const stateValue = Number(proposal.state);
            const typeValue = Number(proposal.votingType);
            const isActive = statusLabel(stateValue) === "Active";
            const typeLabel = typeValue === 1 ? "Quadratic" : "Standard";
            const remainingBlocks =
              proposal.endBlock > currentBlock ? proposal.endBlock - currentBlock : 0n;
            const chartData = [
              { name: "For", value: Number(proposal.votes.forVotes) },
              { name: "Against", value: Number(proposal.votes.againstVotes) },
              { name: "Abstain", value: Number(proposal.votes.abstainVotes) }
            ];

            return (
              <li
                key={proposal.id.toString()}
                data-testid="proposal-list-item"
                className="proposal-card rounded-3xl p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{proposal.description}</h3>
                    <p className="text-slate mt-2">
                      Status: <span className="text-white">{statusLabel(stateValue)}</span>
                    </p>
                    <p className="text-slate">
                      Type: <span className="text-white">{typeLabel}</span>
                    </p>
                    <p className="text-slate">
                      Proposer: <span className="text-white font-mono">{shortAddress(proposal.proposer)}</span>
                    </p>
                    {isActive && (
                      <p className="text-slate">
                        Blocks remaining: <span className="text-white">{remainingBlocks.toString()}</span>
                      </p>
                    )}
                  </div>
                  <div className="h-32 w-full md:w-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {isActive && (
                  <div className="mt-4 grid gap-3">
                    {typeValue === 1 && (
                      <input
                        value={quadraticVotes[proposal.id] || "1"}
                        onChange={(event) =>
                          setQuadraticVotes((prev) => ({
                            ...prev,
                            [proposal.id]: event.target.value
                          }))
                        }
                        type="number"
                        min="1"
                        className="w-32 rounded-2xl bg-slate/10 border border-slate/40 px-4 py-2"
                        placeholder="Votes"
                      />
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button
                        data-testid="vote-for-button"
                        onClick={() =>
                          typeValue === 1
                            ? handleQuadraticVote(proposal.id, 1)
                            : handleVote(proposal.id, 1)
                        }
                        className="px-4 py-2 rounded-full bg-mint text-ink font-semibold"
                      >
                        Vote For
                      </button>
                      <button
                        data-testid="vote-against-button"
                        onClick={() =>
                          typeValue === 1
                            ? handleQuadraticVote(proposal.id, 0)
                            : handleVote(proposal.id, 0)
                        }
                        className="px-4 py-2 rounded-full bg-rose text-white font-semibold"
                      >
                        Vote Against
                      </button>
                      <button
                        data-testid="vote-abstain-button"
                        onClick={() =>
                          typeValue === 1
                            ? handleQuadraticVote(proposal.id, 2)
                            : handleVote(proposal.id, 2)
                        }
                        className="px-4 py-2 rounded-full border border-slate/50 text-slate"
                      >
                        Abstain
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
