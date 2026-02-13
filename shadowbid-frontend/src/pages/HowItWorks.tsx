import { Lock, Shield, Users, CheckCircle } from 'lucide-react';

const HowItWorks = () => {
    const steps = [
        {
            number: '01',
            title: 'Create Auction',
            description: 'Set up your blind auction with item details, reserve price, and duration.',
            icon: Users,
            color: 'bg-primary-purple',
        },
        {
            number: '02',
            title: 'Bidders Place Encrypted Bids',
            description: 'All bids are encrypted client-side using Arcium MPC before submission.',
            icon: Lock,
            color: 'bg-primary-blue',
        },
        {
            number: '03',
            title: 'Secure Computation',
            description: 'When auction closes, Arcium MPC determines winner without decrypting bids.',
            icon: Shield,
            color: 'bg-accent-cyan',
        },
        {
            number: '04',
            title: 'Winner Announced',
            description: 'Only winner and winning amount revealed. Losing bids remain private forever.',
            icon: CheckCircle,
            color: 'bg-status-success',
        },
    ];

    return (
        <div className="min-h-screen bg-background-main">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
                        How ShadowBid Works
                    </h1>
                    <p className="text-xl text-text-secondary max-w-3xl mx-auto">
                        Privacy-preserving blind auctions powered by Arcium's Multi-Party Computation
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                    {steps.map((step, index) => (
                        <div key={index} className="relative">
                            <div className="bg-background-card p-6 rounded-xl border border-border h-full">
                                <div className={`${step.color} w-16 h-16 rounded-lg flex items-center justify-center mb-4`}>
                                    <step.icon className="w-8 h-8 text-white" />
                                </div>
                                <div className="text-4xl font-bold text-text-muted mb-2">{step.number}</div>
                                <h3 className="text-xl font-semibold text-text-primary mb-2">{step.title}</h3>
                                <p className="text-text-secondary">{step.description}</p>
                            </div>
                            {index < steps.length - 1 && (
                                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border"></div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="bg-primary-purple bg-opacity-10 rounded-xl p-8 border border-primary-purple">
                    <h2 className="text-2xl font-bold text-text-primary mb-4">Privacy Guarantees</h2>
                    <ul className="space-y-3">
                        <li className="flex items-start space-x-3">
                            <CheckCircle className="w-6 h-6 text-status-success flex-shrink-0" />
                            <p className="text-text-secondary">Bids encrypted before hitting blockchain</p>
                        </li>
                        <li className="flex items-start space-x-3">
                            <CheckCircle className="w-6 h-6 text-status-success flex-shrink-0" />
                            <p className="text-text-secondary">MEV protection through encryption</p>
                        </li>
                        <li className="flex items-start space-x-3">
                            <CheckCircle className="w-6 h-6 text-status-success flex-shrink-0" />
                            <p className="text-text-secondary">Collusion resistant - bidders can't see each other</p>
                        </li>
                        <li className="flex items-start space-x-3">
                            <CheckCircle className="w-6 h-6 text-status-success flex-shrink-0" />
                            <p className="text-text-secondary">Losing bids never revealed</p>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default HowItWorks;