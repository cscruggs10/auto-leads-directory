'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useSubmitLead } from '@/hooks/useLeads';

const leadSchema = z.object({
  // Step 1: Contact Information
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[\d\s\-\(\)\+]+$/, 'Invalid phone number').min(10, 'Phone number must be at least 10 digits'),
  
  // Step 2: Pre-qualification
  employment_status: z.enum(['full_time', 'part_time', 'self_employed', 'unemployed', 'retired']),
  down_payment_available: z.string().transform(val => parseFloat(val)),
  bankruptcy_status: z.enum(['none', 'discharged', 'active']),
  credit_score_range: z.enum(['300-500', '500-600', '600-700', '700+']).optional(),
  preferred_contact_method: z.enum(['phone', 'email', 'text']).optional(),
  preferred_contact_time: z.string().optional(),
  comments: z.string().max(1000).optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadCaptureFormProps {
  vehicleVin: string;
  vehicleInfo?: {
    year: number;
    make: string;
    model: string;
  };
}

export function LeadCaptureForm({ vehicleVin, vehicleInfo }: LeadCaptureFormProps) {
  const [step, setStep] = useState(1);
  const submitLead = useSubmitLead();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      preferred_contact_method: 'phone',
      credit_score_range: '500-600',
    },
  });

  const handleStep1Submit = async () => {
    const isValid = await trigger(['first_name', 'last_name', 'email', 'phone']);
    if (isValid) {
      setStep(2);
    }
  };

  const onSubmit = (data: LeadFormData) => {
    submitLead.mutate({
      ...data,
      vehicle_vin: vehicleVin,
      down_payment_available: Number(data.down_payment_available),
    });
  };

  return (
    <div className="bg-surface rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Request Price & Schedule Test Drive
        </h2>
        {vehicleInfo && (
          <p className="text-text-secondary">
            For {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
          </p>
        )}
        
        {/* Progress Indicator */}
        <div className="flex items-center justify-center mt-4 space-x-2">
          <div className={`w-32 h-1 rounded ${step >= 1 ? 'bg-primary' : 'bg-gray-300'}`} />
          <div className={`w-32 h-1 rounded ${step >= 2 ? 'bg-primary' : 'bg-gray-300'}`} />
        </div>
        <div className="flex justify-between text-sm text-text-secondary mt-2">
          <span className={step === 1 ? 'text-primary font-medium' : ''}>Contact Info</span>
          <span className={step === 2 ? 'text-primary font-medium' : ''}>Pre-Qualification</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                {...register('first_name')}
                error={errors.first_name?.message}
                required
              />
              <Input
                label="Last Name"
                {...register('last_name')}
                error={errors.last_name?.message}
                required
              />
            </div>
            
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              required
            />
            
            <Input
              label="Phone Number"
              type="tel"
              {...register('phone')}
              error={errors.phone?.message}
              placeholder="(555) 123-4567"
              required
            />
            
            <div className="flex justify-end">
              <Button type="button" onClick={handleStep1Submit}>
                Next Step →
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Select
              label="Employment Status"
              {...register('employment_status')}
              error={errors.employment_status?.message}
              options={[
                { value: 'full_time', label: 'Full Time' },
                { value: 'part_time', label: 'Part Time' },
                { value: 'self_employed', label: 'Self Employed' },
                { value: 'retired', label: 'Retired' },
                { value: 'unemployed', label: 'Unemployed' },
              ]}
              required
            />
            
            <Input
              label="Down Payment Available"
              type="number"
              {...register('down_payment_available')}
              error={errors.down_payment_available?.message}
              placeholder="1000"
              helper="Enter the amount you can pay upfront"
              required
            />
            
            <Select
              label="Bankruptcy Status"
              {...register('bankruptcy_status')}
              error={errors.bankruptcy_status?.message}
              options={[
                { value: 'none', label: 'No Bankruptcy' },
                { value: 'discharged', label: 'Discharged Bankruptcy' },
                { value: 'active', label: 'Active Bankruptcy' },
              ]}
              required
            />
            
            <Select
              label="Credit Score Range (Optional)"
              {...register('credit_score_range')}
              error={errors.credit_score_range?.message}
              options={[
                { value: '300-500', label: '300-500' },
                { value: '500-600', label: '500-600' },
                { value: '600-700', label: '600-700' },
                { value: '700+', label: '700+' },
              ]}
            />
            
            <Select
              label="Preferred Contact Method"
              {...register('preferred_contact_method')}
              options={[
                { value: 'phone', label: 'Phone Call' },
                { value: 'email', label: 'Email' },
                { value: 'text', label: 'Text Message' },
              ]}
            />
            
            <Input
              label="Best Time to Contact (Optional)"
              {...register('preferred_contact_time')}
              placeholder="Morning, Afternoon, Evening"
            />
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">
                Additional Comments (Optional)
              </label>
              <textarea
                {...register('comments')}
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Any specific questions or requirements..."
              />
            </div>
            
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                ← Previous
              </Button>
              <Button type="submit" loading={submitLead.isLoading}>
                Submit Request
              </Button>
            </div>
          </div>
        )}
      </form>
      
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-text-secondary text-center">
          By submitting this form, you agree to our{' '}
          <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
          {' '}and{' '}
          <a href="/terms" className="text-primary hover:underline">Terms of Service</a>.
          A dealer representative will contact you within 24-48 hours.
        </p>
      </div>
    </div>
  );
}