import { ArrowLeft } from 'lucide-react';

interface TravelHeaderProps {
    destination: string;
    days: number;
    budget: string;
    onBack: () => void;
}

export default function TravelHeader({ destination, days, budget, onBack }: TravelHeaderProps) {
    return (
        <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-4">
            <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
            >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
                <h1 className="text-xl font-bold text-gray-900">{destination}</h1>
                <p className="text-sm text-gray-500">{days} Days • {budget}</p>
            </div>
        </div>
    );
}
