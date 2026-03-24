import { useState, useEffect } from 'react';
import { Mail, X, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface InquiryFormProps {
  announcementTitle?: string;
  inline?: boolean;
}

export function InquiryForm({ announcementTitle, inline = false }: InquiryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showInlineForm, setShowInlineForm] = useState(false);

  const [residentName, setResidentName] = useState('');
  const [residentEmail, setResidentEmail] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: announcementTitle ? `Re: ${announcementTitle}` : '',
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const residentId = localStorage.getItem('residentId');
    const userType = localStorage.getItem('userType');

    if (!residentId || userType !== 'resident') return;

    const fetchResident = async () => {
      try {
        const res = await fetch(`http://localhost:5001/residents/${encodeURIComponent(residentId)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        const data = await res.json();

        if (!res.ok) {
          console.error(data?.error || 'Failed to fetch resident profile');
          return;
        }

        const fullName = `${data.FirstName || ''} ${data.LastName || ''}`.trim();
        const email = data.Email || '';

        setResidentName(fullName);
        setResidentEmail(email);

        setForm((prev) => ({
          ...prev,
          name: fullName,
          email,
        }));
      } catch (err) {
        console.error('Failed to fetch resident:', err);
      }
    };

    fetchResident();
  }, []);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      subject: announcementTitle ? `Re: ${announcementTitle}` : '',
    }));
  }, [announcementTitle]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!form.subject.trim()) newErrors.subject = 'Subject is required';

    if (!form.message.trim()) newErrors.message = 'Message is required';
    else if (form.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5001/api/inquiry/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentName: form.name,
          email: form.email,
          subject: form.subject,
          message: form.message,
          announcementTitle: announcementTitle || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to send inquiry');
      }

      setSubmitted(true);
      toast.success('Inquiry sent! The barangay will get back to you soon.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send inquiry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowInlineForm(false);
    setSubmitted(false);
    setForm({
      name: residentName,
      email: residentEmail,
      subject: announcementTitle ? `Re: ${announcementTitle}` : '',
      message: '',
    });
    setErrors({});
  };

  const formContent = (
    <div className="space-y-4">
      {submitted ? (
        <div className="text-center py-8 space-y-3">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h3 className="text-lg font-bold text-gray-900">Inquiry Sent!</h3>
          <p className="text-gray-600 text-sm">
            We&apos;ve received your inquiry. The barangay will get back to you soon.
          </p>
          <button
            onClick={handleClose}
            className="mt-4 px-6 py-2 bg-[#2957a1] text-white rounded-lg text-sm font-semibold hover:bg-[#1e3f7a] transition-colors"
          >
            Close
          </button>
        </div>
      ) : (
        <>
          {announcementTitle && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                Regarding
              </p>
              <p className="text-sm text-blue-800 font-medium mt-0.5">{announcementTitle}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={form.name}
              readOnly
              placeholder="Enter your full name"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed focus:outline-none ${
                errors.name ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={form.email}
              readOnly
              placeholder="your@email.com"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed focus:outline-none ${
                errors.email ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Subject *
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="What is your inquiry about?"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2957a1] ${
                errors.subject ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Message *
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Write your inquiry here..."
              rows={4}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2957a1] resize-none ${
                errors.message ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message}</p>}
            <p className="text-xs text-gray-400 mt-1 text-right">{form.message.length} chars</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-3 bg-[#2957a1] hover:bg-[#1e3f7a] disabled:opacity-60 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Inquiry
              </>
            )}
          </button>
        </>
      )}
    </div>
  );

  if (inline) {
    return (
      <div className="mt-6">
        {!showInlineForm ? (
          <button
            onClick={() => setShowInlineForm(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-[#2957a1] hover:bg-[#1e3f7a] text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Mail className="w-4 h-4" />
            Ask Inquiry
          </button>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#2957a1]" />
                <h3 className="text-base font-bold text-[#2957a1]">Send an Inquiry</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {formContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#2957a1] hover:bg-[#1e3f7a] text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
      >
        <Mail className="w-4 h-4" />
        Send Inquiry
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#2957a1]" />
                <h2 className="text-lg font-bold text-[#2957a1]">Send an Inquiry</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5">{formContent}</div>
          </div>
        </div>
      )}
    </>
  );
}