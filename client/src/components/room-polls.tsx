import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { BarChart2, Plus, X, Vote, Check, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Poll } from '@/contexts/watch-together-context';

interface RoomPollsProps {
    polls: Poll[];
    isHost: boolean;
    onCreatePoll: (question: string, options: string[], expiresInMinutes?: number) => void;
    onVote: (pollId: string, optionId: string) => void;
    onClosePoll: (pollId: string) => void;
}

export function RoomPolls({ polls, isHost, onCreatePoll, onVote, onClosePoll }: RoomPollsProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});

    const handleAddOption = () => {
        if (options.length < 6) {
            setOptions([...options, '']);
        }
    };

    const handleRemoveOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleCreate = () => {
        const validOptions = options.filter(o => o.trim());
        if (question.trim() && validOptions.length >= 2) {
            onCreatePoll(question.trim(), validOptions);
            setQuestion('');
            setOptions(['', '']);
            setShowCreateForm(false);
        }
    };

    const handleVote = (pollId: string, optionId: string) => {
        onVote(pollId, optionId);
        setVotedPolls(prev => ({ ...prev, [pollId]: optionId }));
    };

    const activePolls = polls.filter(p => p.isActive);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Polls</span>
                    {activePolls.length > 0 && (
                        <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
                            {activePolls.length}
                        </span>
                    )}
                </div>
                {isHost && !showCreateForm && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowCreateForm(true)}
                        className="h-7 text-xs"
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        New Poll
                    </Button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Create Poll Form */}
                {showCreateForm && isHost && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Create Poll</span>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowCreateForm(false)}
                                className="h-6 w-6 p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <Input
                            placeholder="Ask a question..."
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            className="text-sm"
                        />

                        <div className="space-y-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        placeholder={`Option ${index + 1}`}
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        className="text-sm"
                                    />
                                    {options.length > 2 && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleRemoveOption(index)}
                                            className="h-9 w-9 p-0 shrink-0"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            {options.length < 6 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleAddOption}
                                    className="text-xs"
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Option
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={handleCreate}
                                disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
                                className="ml-auto text-xs"
                            >
                                Create Poll
                            </Button>
                        </div>
                    </div>
                )}

                {/* Active Polls */}
                {activePolls.map(poll => {
                    const totalVotes = poll.options.reduce((sum, o) => sum + o.voteCount, 0);
                    const hasVoted = !!votedPolls[poll.id];

                    return (
                        <div key={poll.id} className="bg-card border border-border rounded-lg p-3 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-sm font-medium">{poll.question}</span>
                                {isHost && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => onClosePoll(poll.id)}
                                        className="h-6 text-xs shrink-0"
                                    >
                                        Close
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-2">
                                {poll.options.map(option => {
                                    const percentage = totalVotes > 0
                                        ? Math.round((option.voteCount / totalVotes) * 100)
                                        : 0;
                                    const isMyVote = votedPolls[poll.id] === option.id;

                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => handleVote(poll.id, option.id)}
                                            className={cn(
                                                "w-full text-left p-2 rounded-md border transition-all relative overflow-hidden",
                                                isMyVote
                                                    ? "border-primary bg-primary/10"
                                                    : "border-border hover:border-primary/50"
                                            )}
                                        >
                                            {/* Progress bar */}
                                            <div
                                                className="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-300"
                                                style={{ width: `${percentage}%` }}
                                            />

                                            <div className="relative flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {isMyVote && <Check className="h-3 w-3 text-primary" />}
                                                    <span className="text-sm">{option.text}</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {option.voteCount} ({percentage}%)
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="text-xs text-muted-foreground text-center">
                                {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                            </div>
                        </div>
                    );
                })}

                {/* Empty state */}
                {activePolls.length === 0 && !showCreateForm && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Vote className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No active polls</p>
                        {isHost && (
                            <p className="text-xs mt-1">Create a poll to engage with viewers</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
