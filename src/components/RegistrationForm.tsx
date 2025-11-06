import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';
import * as localDB from '../utils/localStorage';

export function RegistrationForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [participantId, setParticipantId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      console.log('[LOCAL] Registering participant:', formData);
      
      const participant: localDB.Participant = {
        id: localDB.generateParticipantId(),
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '',
        company: formData.company || '',
        position: formData.position || '',
        registeredAt: new Date().toISOString(),
        attendance: [],
      };

      localDB.saveParticipant(participant);

      setIsSuccess(true);
      setParticipantId(participant.id);
      setFormData({ name: '', email: '', phone: '', company: '', position: '' });
      console.log('[LOCAL] Registration successful:', participant.id);
    } catch (err: any) {
      console.error('[LOCAL] Registration error:', err);
      setError(err.message || 'Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle>Registration Successful!</CardTitle>
          <CardDescription>
            Thank you for registering. A confirmation email with your QR code has been sent to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Your Participant ID:</p>
            <p className="text-xl">{participantId}</p>
          </div>
          <div className="text-center">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${participantId}`}
              alt="QR Code"
              className="mx-auto rounded-lg border"
            />
            <p className="text-sm text-muted-foreground mt-4">
              Save this QR code or check your email for event check-in
            </p>
          </div>
          <Button 
            onClick={() => setIsSuccess(false)} 
            variant="outline"
            className="w-full"
          >
            Register Another Participant
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Event Registration</CardTitle>
        <CardDescription>
          Please fill in your details to register for the event
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              name="company"
              type="text"
              placeholder="Acme Inc."
              value={formData.company}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              name="position"
              type="text"
              placeholder="Software Engineer"
              value={formData.position}
              onChange={handleChange}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              'Register'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
