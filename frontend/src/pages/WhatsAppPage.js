import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollArea } from '../components/ui/scroll-area';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import {
  Search, Send, Phone, Video, MoreVertical, Paperclip,
  Check, CheckCheck, Clock, User
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ConversationItem = ({ lead, isActive, onClick, lastMessage }) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors rounded-lg ${
        isActive ? 'bg-primary/10' : 'hover:bg-muted'
      }`}
      data-testid={`conversation-${lead.id}`}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary/20 text-primary">
          {lead.name?.charAt(0) || 'L'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm truncate">{lead.name}</h4>
          {lastMessage && (
            <span className="text-xs text-muted-foreground">
              {new Date(lastMessage.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {lastMessage?.content || lead.phone || 'Sem mensagens'}
        </p>
      </div>
    </div>
  );
};

const MessageBubble = ({ message, isUser }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={isUser ? 'chat-bubble-sent' : 'chat-bubble-received'}>
        <p className="text-sm">{message.content}</p>
        <div className={`flex items-center gap-1 mt-1 text-xs ${isUser ? 'text-white/70' : 'text-muted-foreground'}`}>
          <span>
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isUser && <CheckCheck className="w-3 h-3" />}
        </div>
      </div>
    </div>
  );
};

const WhatsAppPage = () => {
  const [leads, setLeads] = useState([]);
  const [conversations, setConversations] = useState({});
  const [selectedLead, setSelectedLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, convsRes] = await Promise.all([
        axios.get(`${API_URL}/leads`),
        axios.get(`${API_URL}/whatsapp/conversations`)
      ]);
      
      setLeads(leadsRes.data);
      
      // Map conversations by lead_id
      const convsMap = {};
      convsRes.data.forEach(conv => {
        convsMap[conv.lead_id] = conv;
      });
      setConversations(convsMap);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedLead) {
      const conv = conversations[selectedLead.id];
      setMessages(conv?.messages || []);
    }
  }, [selectedLead, conversations]);

  const handleSelectLead = async (lead) => {
    setSelectedLead(lead);
    
    // Fetch conversation for this lead
    try {
      const response = await axios.get(`${API_URL}/whatsapp/conversations/${lead.id}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedLead) return;

    setSending(true);
    try {
      const response = await axios.post(
        `${API_URL}/whatsapp/send?lead_id=${selectedLead.id}&message=${encodeURIComponent(newMessage)}`
      );
      
      setMessages(prev => [...prev, response.data.message]);
      setNewMessage('');
      
      // Simulate auto-reply after 2 seconds (MOCKED)
      setTimeout(() => {
        const autoReply = {
          id: Date.now().toString(),
          content: 'Obrigado pela mensagem! Retornaremos em breve.',
          sent_by: 'contact',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, autoReply]);
      }, 2000);
      
      toast.success('Mensagem enviada (MOCKADO)');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const filteredLeads = searchTerm
    ? leads.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm)
      )
    : leads;

  const templates = [
    'Olá! Como posso ajudar?',
    'Obrigado pelo interesse! Posso agendar uma demonstração?',
    'Segue nossa proposta comercial em anexo.',
    'Tem disponibilidade para uma reunião esta semana?'
  ];

  if (loading) {
    return (
      <div className="h-[calc(100vh-140px)] flex gap-4" data-testid="whatsapp-loading">
        <Skeleton className="w-80 h-full" />
        <Skeleton className="flex-1 h-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="whatsapp-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-outfit text-3xl font-bold">WhatsApp Inbox</h1>
          <p className="text-muted-foreground">Gerencie suas conversas (MOCKADO)</p>
        </div>
        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Ambiente de Teste
        </Badge>
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)] bg-card rounded-xl border overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="search-conversations"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredLeads.length > 0 ? (
                filteredLeads.map(lead => (
                  <ConversationItem
                    key={lead.id}
                    lead={lead}
                    isActive={selectedLead?.id === lead.id}
                    onClick={() => handleSelectLead(lead)}
                    lastMessage={conversations[lead.id]?.messages?.slice(-1)[0]}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum lead encontrado
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Window */}
        <div className="flex-1 flex flex-col">
          {selectedLead ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {selectedLead.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedLead.name}</h3>
                    <p className="text-xs text-muted-foreground">{selectedLead.phone || 'Sem telefone'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messages.length > 0 ? (
                  messages.map((message, idx) => (
                    <MessageBubble
                      key={message.id || idx}
                      message={message}
                      isUser={message.sent_by === 'user'}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhuma mensagem ainda</p>
                    <p className="text-xs mt-2">Envie a primeira mensagem!</p>
                  </div>
                )}
              </ScrollArea>

              {/* Quick Templates */}
              <div className="px-4 py-2 border-t flex gap-2 overflow-x-auto">
                {templates.map((template, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0 text-xs"
                    onClick={() => setNewMessage(template)}
                  >
                    {template.substring(0, 30)}...
                  </Button>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex items-end gap-2">
                  <Button variant="ghost" size="icon">
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    data-testid="message-input"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!newMessage.trim() || sending}
                    data-testid="send-message-button"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Selecione uma conversa</p>
                <p className="text-sm">para começar a mensagem</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppPage;
