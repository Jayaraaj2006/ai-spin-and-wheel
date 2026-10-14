import { UserCheck, Disc, FileText, Check } from 'lucide-react';

export default function StepProgress({ currentStep }) {
  const steps = [
    { id: 'registration', label: 'Team Registration', icon: UserCheck, stepNum: '01' },
    { id: 'wheel', label: 'Spin Wheel', icon: Disc, stepNum: '02' },
    { id: 'reveal', label: 'Problem Brief', icon: FileText, stepNum: '03' },
  ];

  const getStepStatus = (stepId, index) => {
    const order = ['registration', 'wheel', 'reveal'];
    const currentIndex = order.indexOf(currentStep);
    if (currentIndex > index) return 'completed';
    if (currentIndex === index) return 'current';
    return 'upcoming';
  };

  return (
    <nav aria-label="Symposium Progress" className="w-full max-w-2xl mx-auto px-4 my-6">
      <div className="relative flex items-center justify-between">
        {/* Connecting track line */}
        <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-[#3A3B3A] -z-0">
          <div
            className="h-full bg-[#D9653B] transition-all duration-500 ease-out"
            style={{
              width:
                currentStep === 'registration'
                  ? '0%'
                  : currentStep === 'wheel'
                  ? '50%'
                  : '100%',
            }}
          />
        </div>

        {steps.map((step, idx) => {
          const status = getStepStatus(step.id, idx);
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 border-2 ${
                  status === 'completed'
                    ? 'bg-[#D9653B] border-[#D9653B] text-[#F2EEE5]'
                    : status === 'current'
                    ? 'bg-[#101216] border-[#D9653B] text-[#D9653B] ring-4 ring-[#D9653B]/20 scale-105'
                    : 'bg-[#101216] border-[#3A3B3A] text-[#B9B3A8]'
                }`}
              >
                {status === 'completed' ? (
                  <Check className="w-4 h-4 text-[#F2EEE5] stroke-[2.5]" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="flex flex-col items-center mt-2">
                <span className="font-mono text-[9px] text-[#B9B3A8]/70 tracking-widest uppercase">
                  Step {step.stepNum}
                </span>
                <span
                  className={`text-[11px] sm:text-xs font-heading font-medium tracking-wide transition-colors ${
                    status === 'current'
                      ? 'text-[#D9653B] font-semibold'
                      : status === 'completed'
                      ? 'text-[#F2EEE5]'
                      : 'text-[#B9B3A8]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
